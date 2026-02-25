export default {

  Shared: {
    //Auth
    SET_PASSWORD: '/auth/set-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    USER_LOGIN: '/auth/login',
    USER_LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    AUTH_ME: '/auth/me',
  },


  Admin: {
    ADD_CLIENT: '/add-client',
    GET_CLIENT: '/get-client/:id',
    GET_CLIENTS: '/get-clients',
    UPDATE_CLIENT: '/update-client/:id',
    DELETE_CLIENT: '/delete-client/:id',
  },
};
