const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const VjournalSchema = new Schema({
  uid: { type: Number, unique: true, require: true, dropDups: true },
  organizer: String,
  description: String,
  dtstamp: String,
  dtstart: Date,
  sequence: String,
  optional: String
});

const Vjournal = mongoose.model("Vjournal", VjournalSchema);

module.exports = Vjournal;
