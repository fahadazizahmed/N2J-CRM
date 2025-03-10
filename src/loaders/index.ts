import expressLoader from "./express"
import { Application } from "express"
import { connectToMongo } from "../connection/mongoose"

export default async ({ expressApp }: { expressApp: Application }) => {
	connectToMongo()
	expressLoader({ app: expressApp })
	// Logger.info("✌️ Express loaded");
}
