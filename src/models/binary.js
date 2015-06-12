var mongoose = require('mongoose');

var binarySchema = new mongoose.Schema({
    content: { type: mongoose.Schema.Types.Buffer },
});

var Binary = mongoose.model('Binary', binarySchema);

module.exports = Binary;
