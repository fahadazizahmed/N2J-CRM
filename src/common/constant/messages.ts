const InfoMessages = {
  GENERIC: {
    ITEM_DELETE_SUCCESSFULLY: (key: string, id: string) =>
      `${key} Item with id: ${id} deleted successfully.`,

    ITEM_UPDATED_SUCCESSFULLY: (key: string) =>
      `${key}  updated successfully.`,
    ITEM_UPDATED_SUCCESSFULLY_ATTRIBUTE: (key: string, id: string, attribute: string) =>
      `Attribute ${attribute} of ${key} Item with id: ${id} updated successfully.`,
    ITEM_CREATED_SUCCESSFULLY: (key: string) => `${key} created successfully.`,
    ITEM_GET_SUCCESSFULLY: (key: string) => `${key} Item get successfully.`,
    ITEM_DELETED_SUCCESSFULLY: (key: string) => `${key} suspended successfully.`,
    ITEM_FETCHED_SUCCESSFULLY: (key: string) => `${key} fetched successfully.`,
  },
  AUTH: {
    PASSWORD_LENGTH_ERROR: 'Password must be greater then 6 letter',
    LOGGED_IN_SUCCESSFULLY: "Logged in successfully.",
    LOGGED_OUT_SUCCESSFULLY: "Logged out successfully."
  },



  LOGGER_MESSAGE: {
    CONTRACT_GENERATE_INFOT_CREATED_SUCCESSFULLY: 'Contract generar info created successfully',
    PASSWORD_RESET: "Password Reset",
    PASSWORD_SET_AND_ACCOUNT_ACTIVATED: "Password Set and Account Activated",
    PASSWORD_RESET_REQUESTED: "Password Reset Requested",
    ROLE_SELECTED: "Role Selected",
    CLIENT_CREATED_AND_INVITATION_SENT: "Client created and invitation sent",
    TIP_COMPANY_CREATED: "Tip company created"


  }






  //AUT_MODULE_ERROR
  //PROFILE_MODILE_ERRO
  //
};

export default InfoMessages;
