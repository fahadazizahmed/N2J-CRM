export default {
  Admin: {
    CREATE_JOB: '/job/create-job',
    UPDATE_JOB: '/job/update-job/:id',
    GET_JOB: '/job/get-job/:id',
    GET_JOBS: '/job/get-jobs',


    // UPLOAD_CONTRACT_DOCS: '/contract/upload-contract-docs',
    // GET_CONTRACT: '/contract/get-contract/:id',
    // GET_CONTRACTS: '/contract/get-contracts',
    // // ─ Rate Management ─────────────────────────────────────────────
    // ADD_CONTRACT_RATE: '/contract/add-rates/:id',          // POST  — draft only
    // UPDATE_DRAFT_CONTRACT_RATE: '/contract/update-draft-contract-rate/:id/:rateId',
    // CHANGE_CONTRACT_RATE: '/contract/change-active-contract-rate/:id',   // PUT   — active/suspended

    // GET_CONTRACT_RATES: '/contract/:id/rates',          // GET
    // DELETE_CONTRACT_RATE: '/contract/:id/rates/:rateId',  // DELETE — draft only
  },
};
