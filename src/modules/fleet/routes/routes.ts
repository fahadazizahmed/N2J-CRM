export default {
  Admin: {
    VEHICLE: {
      ADD_NEW_VEHICLE: '/fleet/vehicle/add-vehicle',
      UPDATE_VEHICLE: '/fleet/vehicle/update-vehicle/:id',
      UPLOAD_VEHICLE_MEDIA: '/fleet/vehicle/upload-media/:id',
      GET_VEHICLES: '/fleet/vehicle/get-vehicles',
      GET_BASIC_VEHICLES: '/fleet/vehicle/get-active-idle-vehicles',
      GET_VEHICLES_WITH_DRIVER_DETAILS: '/fleet/vehicle/get-vehicles-with-driver-details',
      GET_VEHICLE_STATUSES: '/fleet/vehicle/get-vehicle-statuses',
      GET_VEHICLE_TYPES: '/fleet/vehicle/get-vehicle-types',
      ASSIGN_DRIVER: '/fleet/vehicle/assign-driver/:id',
      GET_VEHICLE_BY_ID: '/fleet/vehicle/get-vehicle/:id',
    },
    DRIVER: {
      ADD_NEW_DRIVER: '/fleet/driver/add-driver',
      UPDATE_DRIVER: '/fleet/driver/update-driver/:id',
      ADD_DRIVER_RATES: '/fleet/driver/add-driver-rates/:id',
      GET_DRIVERS_ENUMS: '/fleet/driver/get-deriver-enums',
      GET_DRIVERS: '/fleet/driver/get-drivers',
      GET_DRIVER_BY_ID: '/fleet/driver/get-driver/:id',
      UPLOAD_DRIVER_DOCS: '/fleet/driver/upload-docs/:id',
      ASSIGN_VEHICLE: '/fleet/driver/assign-vehicle/:id',
      GET_DRIVERS_WITH_VEHICLE_DETAILS: '/fleet/driver/get-driver-with-vehicle-details',
      GET_ALL_ACTIVE_NOT_ASSIGN_VEHICLE_DRIVERS: '/fleet/driver/get-active-not-assign-vehicles-drivers',
    }

  },
};
