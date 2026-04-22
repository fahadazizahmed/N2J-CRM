export default {
  Admin: {
    CREATE_JOB: '/job/create-job',
    UPDATE_JOB: '/job/update-job/:id',
    UPDATE_JOB_STATUS: '/job/update-job-status/:id',
    UPSERT_DISPATCH: '/job/upsert-dispatch/:id',
    UPLOAD_DISPATCH_DOCS: '/job/upload-dispatch-docs/:id',
    GET_JOB_STATS: '/job/job-stats',
    GET_JOB: '/job/get-job/:id',
    GET_JOB_LOGS: '/job/get-job-logs/:id',
    GET_JOBS: '/job/get-jobs',
    GET_PRE_MATERIALS: '/job/get-pre-materials',
  },
  Client: {
    GET_MY_JOBS: '/job/my-jobs',
  },
};

