const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
    },
    from: {
        type: String,
        required: true,
    },
    currentDate:{
        type: Date,
        default: Date.now,
    },
    receivedDateTime: {
        type: Date,
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
});

const Email = mongoose.model('Email', emailSchema);

module.exports = Email;