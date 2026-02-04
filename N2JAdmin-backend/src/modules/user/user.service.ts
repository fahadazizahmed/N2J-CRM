import { hashPassword } from '../../utils/hash.util';
import { sendCredentialsEmail } from '../../utils/email.util';
import { ICreateUserDTO, IUserResponse } from './user.dto';
import { BadRequestError } from '../../errors/bad-request-error';

/**
 * User Service
 * Contains business logic for user management
 */

export interface IUserService {
    createUser(data: ICreateUserDTO, performedBy: string): Promise<IUserResponse>;
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

            // Step 1: Check if email already exists
            console.log('\n📝 Step 2: Checking email uniqueness...');
            // TODO: add DB queries here
            // const existingUser = await db.user.findUnique({ where: { email: data.email } });
            // if (existingUser) throw new BadRequestError('Email already exists');
            console.log('   ✅ Email is unique (simulated)');

            // Step 2: Hash the password
            console.log('\n📝 Step 3: Hashing password...');
            const hashedPassword = await hashPassword(data.password);
            console.log('   ✅ Password hashed successfully');
            console.log('   Original:', data.password);
            console.log('   Hashed:', hashedPassword);

            // Step 3: Generate user ID (in real app, this would be from database)
            const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('\n📝 Step 4: Generating user ID...');
            console.log('   User ID:', userId);

            // Step 4: Prepare user data for database insertion
            console.log('\n📝 Step 5: Preparing user data for database...');
            const userData = {
                id: userId,
                email: data.email,
                password: hashedPassword,
                role: data.role,
                createdAt: new Date(),
            };
            console.log('   User Data:', JSON.stringify(userData, null, 2));

            // TODO: add DB queries here
            // const newUser = await db.user.create({ data: userData });
            console.log('   ✅ User would be created in database here');

            // Step 5: Create role-specific record if needed
            if (['DRIVER', 'CLIENT', 'SUBCONTRACTOR'].includes(data.role)) {
                console.log(`\n📝 Step 6: Preparing role-specific record for ${data.role}...`);
                const roleData = {
                    id: `${data.role.toLowerCase()}-${Date.now()}`,
                    userId: userId,
                    createdAt: new Date(),
                };
                console.log(`   ${data.role} Data:`, JSON.stringify(roleData, null, 2));

                // TODO: add DB queries here
                // if (data.role === 'DRIVER') await db.driver.create({ data: { userId } });
                // if (data.role === 'CLIENT') await db.client.create({ data: { userId } });
                // if (data.role === 'SUBCONTRACTOR') await db.subcontractor.create({ data: { userId } });
                console.log(`   ✅ ${data.role} record would be created in database here`);
            } else {
                console.log('\n📝 Step 6: No role-specific record needed');
            }

            // Step 6: Create audit log entry
            console.log('\n📝 Step 7: Creating audit log entry...');
            const auditLog = {
                id: `audit-${Date.now()}`,
                action: 'USER_CREATED',
                entity: 'User',
                entityId: userId,
                performedBy: performedBy,
                metadata: {
                    email: data.email,
                    role: data.role,
                },
                createdAt: new Date(),
            };
            console.log('   Audit Log:', JSON.stringify(auditLog, null, 2));

            // TODO: add DB queries here
            // await db.auditLog.create({ data: auditLog });
            console.log('   ✅ Audit log would be saved to database here');

            // Step 7: Send credentials email
            console.log('\n📝 Step 8: Sending credentials email...');
            sendCredentialsEmail(data.email, data.password, data.role).catch((error) => {
                console.error('   ⚠️ Email sending failed (non-blocking):', error.message);
            });

            // Step 8: Prepare response (without password)
            const userResponse: IUserResponse = {
                id: userId,
                email: data.email,
                role: data.role,
                createdAt: userData.createdAt,
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
}
