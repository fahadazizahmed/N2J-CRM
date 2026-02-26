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
    ADD_CLIENT: '/crm/add-client',
    UPDATE_CLIENT: '/crm/update-client/:id',
    GET_CLIENT: '/crm/get-client/:id',
    GET_CLIENTS: '/crm/get-clients'
  },
};
