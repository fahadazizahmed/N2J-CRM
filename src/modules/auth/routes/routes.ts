export default {
  Shared: {
    //Auth
    SET_PASSWORD: '/auth/set-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    USER_LOGIN: '/auth/login',
    USER_LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    AUTH_ME: '/auth/me',
    SELECT_ROLE: '/auth/select-role',
  },
  Admin: {
    //Auth
    ADD_USER: '/auth/add-user',
    RESEND_INVITE: '/auth/resend-invite/:userId',
  },

  SubContractor: {
    //Auth
    ADD_NEW_SUB_CONTRACTOR: '/auth/add-subcontractor',
    UPDATE_SUB_CONTRACTOR: '/auth/update-subcontractor/:id',
    UPLOAD_SUB_CONTRACTOR_DOCS: '/auth/upload-subcontractor-docs/:id',
    GET_SUB_CONTRACTOR_BY_ID: '/auth/get-subcontractor/:id',
    GET_ALL_SUB_CONTRACTORS: '/auth/subcontractors',
    GET_ALL_SUB_CONTRACTORS_LIST: '/auth/subcontractors-list',

  },



};