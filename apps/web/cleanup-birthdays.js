const mongoose = require('mongoose');

// Quick script to delete existing birthday records
const uri = 'mongodb+srv://pablorian76_db_user:N7Posgw4Gzwy3HJH@qrcode.1m9ioda.mongodb.net/miconsu?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(uri);
  
  const AppointmentSchema = new mongoose.Schema({
    reason: String,
    googleEventId: String
  }, { collection: 'appointments', strict: false });
  
  const Appointment = mongoose.model('AppointmentTest', AppointmentSchema);
  
  const result = await Appointment.deleteMany({
    $or: [
      { reason: { $regex: /cumpleaños/i } },
      { reason: { $regex: /birthday/i } },
      { reason: { $regex: /día de/i } },
      { reason: { $regex: /day of/i } }
    ]
  });
  
  console.log('Deleted ' + result.deletedCount + ' birthday/holiday appointments.');
  process.exit();
}

run().catch(console.error);
