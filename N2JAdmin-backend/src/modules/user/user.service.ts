import { hashPassword } from '../../utils/hash.util';
import { sendCredentialsEmail } from '../../utils/email.util';
import { ICreateUserDTO, IUserResponse } from './user.dto';
import { BadRequestError } from '../../errors/bad-request-error';
import prisma from '../../utils/prisma.util';

/**
 * User Service
 * Contains business logic for user management with Prisma ORM
 */

export interface IUserService {
    createUser(data: ICreateUserDTO, performedBy: string): Promise<IUserResponse>;
    findUserByEmail(email: string): Promise<IUserResponse | null>;
    updateUser(id: number, data: Partial<ICreateUserDTO>): Promise<IUserResponse>;
    deleteUser(id: number): Promise<void>;
}

export default class UserService implements IUserService {
    /**
     * Create a new user
     * @param data - User creation data
     * @param performedBy - ID of admin creating the user
     * @returns Created user data (without password)
     */
    public async createUser(data: ICreateUserDTO, performedBy: string): Promise<IUserResponse> {
        try {
            console.log('\n==================== USER CREATION PROCESS ====================');
            console.log('📝 Step 1: Validating user data...');
            console.log('   Email:', data.email);
            console.log('   Role:', data.role);
            console.log('   Performed By:', performedBy);

            // Step 1: Check if email+role combination already exists using Prisma
            console.log('\n📝 Step 2: Checking email+role uniqueness...');
            const existingUser = await prisma.user.findUnique({
                where: {
                    email_role_unique: {
                        email: data.email,
                        role: data.role,
                    },
                },
            });

            if (existingUser) {
                console.log(`   ❌ User with email ${data.email} and role ${data.role} already exists`);
                throw new BadRequestError(`A user with email ${data.email} and role ${data.role} already exists`);
            }
            console.log('   ✅ Email+Role combination is unique');

            // Step 2: Hash the password
            console.log('\n📝 Step 3: Hashing password...');
            const hashedPassword = await hashPassword(data.password);
            console.log('   ✅ Password hashed successfully');

            // Step 3: Create user and role-specific record in a transaction
            console.log('\n📝 Step 4: Creating user and role-specific record in transaction...');
            console.log(`   Target Role: ${data.role}`);

            const result = await prisma.$transaction(async (tx) => {
                // Create user first
                console.log('   → Creating user in users table...');
                const newUser = await tx.user.create({
                    data: {
                        email: data.email,
                        password: hashedPassword,
                        role: data.role,
                    },
                });
                console.log(`   ✅ User created with ID: ${newUser.id}`);

                // Create role-specific record based on role
                if (data.role === 'DRIVER') {
                    if (!data.driverData) {
                        throw new BadRequestError('Driver data is required for DRIVER role');
                    }
                    console.log('   → Creating driver record...');
                    await tx.driver.create({
                        data: {
                            userId: newUser.id,
                            firstName: data.driverData.firstName,
                            lastName: data.driverData.lastName,
                            licenseNumber: data.driverData.licenseNumber,
                            insuranceDetails: data.driverData.insuranceDetails,
                            whiteCard: data.driverData.whiteCard,
                            type: data.driverData.type || 'IN_HOUSE',
                            status: data.driverData.status || 'ACTIVE',
                        },
                    });
                    console.log('   ✅ Driver record created successfully');
                }

                if (data.role === 'CLIENT') {
                    if (!data.clientData) {
                        throw new BadRequestError('Client data is required for CLIENT role');
                    }
                    console.log('   → Creating client record...');
                    await tx.client.create({
                        data: {
                            userId: newUser.id,
                            companyName: data.clientData.companyName,
                            contactName: data.clientData.contactName,
                            email: data.clientData.email,
                            phone: data.clientData.phone,
                            address: data.clientData.address,
                        },
                    });
                    console.log('   ✅ Client record created successfully');
                }

                if (data.role === 'SUBCONTRACTOR') {
                    if (!data.subcontractorData) {
                        throw new BadRequestError('Subcontractor data is required for SUBCONTRACTOR role');
                    }
                    console.log('   → Creating subcontractor record...');
                    await tx.subcontractor.create({
                        data: {
                            userId: newUser.id,
                            companyName: data.subcontractorData.companyName,
                            contactName: data.subcontractorData.contactName,
                            email: data.subcontractorData.email,
                            phone: data.subcontractorData.phone,
                            address: data.subcontractorData.address,
                        },
                    });
                    console.log('   ✅ Subcontractor record created successfully');
                }

                return newUser;
            });

            console.log('   ✅ Transaction completed successfully');

            // Step 4: Send credentials email (non-blocking)
            console.log('\n📝 Step 5: Sending credentials email...');
            sendCredentialsEmail(data.email, data.password, data.role).catch((error) => {
                console.error('   ⚠️ Email sending failed (non-blocking):', error.message);
            });

            // Step 5: Prepare response (without password)
            const userResponse: IUserResponse = {
                id: result.id.toString(),
                email: result.email,
                role: result.role,
                createdAt: result.createdAt,
            };

            console.log('\n✅ USER CREATION COMPLETED SUCCESSFULLY');
            console.log('==================== END ====================\n');

            return userResponse;
        } catch (error: any) {
            console.error('\n❌ USER CREATION FAILED');
            console.error('Error:', error.message);
            console.error('==================== END ====================\n');
            throw error;
        }
    }

    /**
     * Find user by email
     * @param email - User email address
     * @returns User data (without password) or null if not found
     */
    public async findUserByEmail(email: string): Promise<IUserResponse | null> {
        try {
            // Normalize email to lowercase
            const normalizedEmail = email.toLowerCase().trim();

            const user = await prisma.user.findFirst({
                where: { email: normalizedEmail },
            });

            if (!user) {
                return null;
            }

            return {
                id: user.id.toString(),
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            };
        } catch (error: any) {
            console.error('Error finding user by email:', error.message);
            throw error;
        }
    }

    /**
     * Update user
     * @param id - User ID
     * @param data - Update data
     * @returns Updated user data (without password)
     */
    public async updateUser(
        id: number,
        userData: Partial<ICreateUserDTO>
    ): Promise<IUserResponse | null> {
        try {
            // Normalize email if present
            if (userData.email) {
                userData.email = userData.email.toLowerCase().trim();
            }

            // Prepare update data
            const updateData: any = {};

            if (userData.email) {
                // Check if email is already taken by another user
                const existingUser = await prisma.user.findFirst({
                    where: { email: userData.email },
                });

                if (existingUser && existingUser.id !== id) {
                    throw new BadRequestError('Email already exists');
                }

                updateData.email = userData.email;
            }

            if (userData.password) {
                updateData.password = await hashPassword(userData.password);
            }

            if (userData.role) {
                updateData.role = userData.role;
            }

            // Update user
            const updatedUser = await prisma.user.update({
                where: { id },
                data: updateData,
            });

            return {
                id: updatedUser.id.toString(),
                email: updatedUser.email,
                role: updatedUser.role,
                createdAt: updatedUser.createdAt,
            };
        } catch (error: any) {
            console.error('Error updating user:', error.message);
            throw error;
        }
    }

    /**
     * Delete user
     * @param id - User ID
     */
    public async deleteUser(id: number): Promise<void> {
        try {
            await prisma.user.delete({
                where: { id },
            });

            console.log(`✅ User with ID ${id} deleted successfully`);
        } catch (error: any) {
            console.error('Error deleting user:', error.message);
            throw error;
        }
    }
}
