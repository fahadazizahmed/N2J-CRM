import mongoose, { Schema } from "mongoose"
import { UserDefaultRole, UserRoles, UserRoleType } from "./auth.dto"

interface IUserTypes {
    id: Schema.Types.ObjectId
    fullName?: string
    password: string
    role: UserRoleType

}

const userSchema = new mongoose.Schema(
    // TODO: add furhter things here
    {
        username: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
            select: false,

        },
        fullName: {
            type: String,
            required: false,
        },
        role: {
            type: String,
            enum: UserRoles,
            default: UserDefaultRole,
        },
    },

)

const User = mongoose.model<IUserTypes>("User", userSchema)

export { User as default, }
