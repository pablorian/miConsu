
const mongoose = require('mongoose');

const uri = "mongodb+srv://pablorian76_db_user:N7Posgw4Gzwy3HJH@qrcode.1m9ioda.mongodb.net/QRCode?retryWrites=true&w=majority";

const QRCodeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  url: { type: String, required: true },
  shortId: { type: String },
  qrImage: { type: String, required: true },
  scans: { type: Number, default: 0 },
});

const QRCode = mongoose.model('QRCode', QRCodeSchema);

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to DB");
    const qrs = await QRCode.find({});
    console.log("Found QRs:", qrs.length);
    qrs.forEach(qr => {
        console.log(`ID: ${qr._id}, ShortID: ${qr.shortId}, URL: ${qr.url}`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}

run();
