export default {
  Admin: {
    VEHICLE: {
      ADD_NEW_VEHICLE: '/fleet/vehicle/add-vehicle',
      UPDATE_VEHICLE: '/fleet/vehicle/update-vehicle/:id',
      UPLOAD_VEHICLE_MEDIA: '/fleet/vehicle/upload-media/:id',
      GET_VEHICLES: '/fleet/vehicle/get-vehicles',
      GET_BASIC_VEHICLES: '/fleet/vehicle/get-active-idle-vehicles',

      GET_VEHICLE_STATUSES: '/fleet/vehicle/get-vehicle-statuses',
      GET_VEHICLE_TYPES: '/fleet/vehicle/get-vehicle-types',
      GET_VEHICLE_BY_ID: '/fleet/vehicle/get-vehicle/:id',
      GET_VEHICLE_DOCS: '/fleet/vehicle/get-vehicle-docs/:id',
      GET_VEHICLE_STATS: '/fleet/vehicle/stats',
    },
    DRIVER: {
      ADD_NEW_DRIVER: '/fleet/driver/add-driver',
      UPDATE_DRIVER: '/fleet/driver/update-driver/:id',
      ADD_DRIVER_RATES: '/fleet/driver/add-driver-rates/:id',
      GET_DRIVERS_ENUMS: '/fleet/driver/get-deriver-enums',
      GET_DRIVERS: '/fleet/driver/get-drivers',
      GET_DRIVER_BY_ID: '/fleet/driver/get-driver/:id',
      UPLOAD_DRIVER_DOCS: '/fleet/driver/upload-docs/:id',
      GET_DRIVER_STATS: '/fleet/driver/stats',
    }

  },

  shared: {
    GET_ACTIVE_IDLE_NOT_ASSIGN_VEHICLES: '/fleet/get-active-idle--not-assign-vehicles',
    GET_ALL_VEHICLES_WITH_DRIVER_DETAILS: '/fleet/get-all-vehicles-with-driver-details',
    GET_DRIVERS_WITH_VEHICLE_DETAILS: '/fleet/get-driver-with-vehicle-details',
    ASSIGN_VEHICLE: '/fleet/assign-vehicle/:id',
    ASSIGN_DRIVER: '/fleet/assign-driver/:id',
    GET_ALL_ACTIVE_NOT_ASSIGN_VEHICLE_DRIVERS: '/fleet/get-active-not-assign-vehicles-drivers',
    GET_VEHICLE_WITH_JOB: '/fleet/get-vehicle-with-job',

  }
};
