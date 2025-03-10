import expressLoader from "./express"
import { Application } from "express"

import { Db } from "mongodb"
import { connectToMongo } from "../connection/mongoose"

export default async ({ expressApp }: { expressApp: Application }) => {
	connectToMongo()
	expressLoader({ app: expressApp })
	// Logger.info("✌️ Express loaded");
}
