export default {
  Admin: {
    ADD_CONTRACT_GENERAL_INFO: '/contract/add-contract-general-info',
    UPDATE_CONTRACT_GENERAL_INFO: '/contract/update-contract-general-info/:id',
    UPDATE_CONTRACT_STATUS: '/contract/update-contract-status/:id',
    UPDATE_CONTRACT_APPROVAL_STATUS: '/contract/update-contract-approval-status/:id',


    UPLOAD_CONTRACT_DOCS: '/contract/upload-contract-docs',
    GET_CONTRACT: '/contract/get-contract/:id',
    GET_CONTRACTS: '/contract/get-contracts',
    GET_ACTIVE_SUPPLIER_CONTRACTS: '/contract/active-supplier-contracts',
    // ─ Rate Management ─────────────────────────────────────────────
    ADD_CONTRACT_RATE: '/contract/add-rates/:id',          // POST  — draft only
    UPDATE_DRAFT_CONTRACT_RATE: '/contract/update-draft-contract-rate/:id/:rateId',
    CHANGE_CONTRACT_RATE: '/contract/change-active-contract-rate/:id',   // PUT   — active/suspended

    GET_CONTRACT_RATES: '/contract/:id/rates',          // GET
    DELETE_CONTRACT_RATE: '/contract/:id/rates/:rateId',  // DELETE — draft only
  },
};
