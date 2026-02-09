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
            console.log('   Original:', data.password);
            console.log('   Hashed:', hashedPassword);

            // Step 3: Create user in database using Prisma
            console.log('\n📝 Step 4: Creating user in database...');
            const newUser = await prisma.user.create({
                data: {
                    email: data.email,
                    password: hashedPassword,
                    role: data.role,
                },
            });
            console.log('   ✅ User created successfully');
            console.log('   User ID:', newUser.id);

            // Step 4: Send credentials email (non-blocking)
            console.log('\n📝 Step 5: Sending credentials email...');
            sendCredentialsEmail(data.email, data.password, data.role).catch((error) => {
                console.error('   ⚠️ Email sending failed (non-blocking):', error.message);
            });

            // Step 5: Prepare response (without password)
            const userResponse: IUserResponse = {
                id: newUser.id.toString(),
                email: newUser.email,
                role: newUser.role,
                createdAt: newUser.createdAt,
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
