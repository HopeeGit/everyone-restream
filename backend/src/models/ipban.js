const mongoose = require("mongoose");

const IpbanSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
  }
});

const IpBan = mongoose.model("IpBan", IpbanSchema);

module.exports = IpBan;