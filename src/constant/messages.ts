
const InfoMessages = {
	GENERIC: {
		ITEM_DELETE_SUCCESSFULLY: (key: string, id: string) => `${key} Item with id: ${id} deleted successfully.`,

		ITEM_UPDATED_SUCCESSFULLY: (key: string, id: string) => `${key} Item with id: ${id} updated successfully.`,
		ITEM_UPDATED_SUCCESSFULLY_ATTRIBUTE: (key: string, id: string, attribute: string) =>
			`Attribute ${attribute} of ${key} Item with id: ${id} updated successfully.`,
		ITEM_CREATED_SUCCESSFULLY: (key: string) => `${key} created successfully.`,
		ITEM_GET_SUCCESSFULLY: (key: string) => `${key} Item get successfully.`,
	},
	AUTH: {
		PASSWORD_LENGTH_ERROR: "Password must be greater then 6 letter"
	}
	//AUT_MODULE_ERROR
	//PROFILE_MODILE_ERRO
	//


}

export default InfoMessages
