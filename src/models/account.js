var mongoose = require('mongoose');

function uuid() {
    /* Source: https://gist.github.com/LeverOne/1308368 */
    var a, b;
    for (b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');
    return b;
}

var binarySchema = {
    properties: {
        path:  String,
        pathGuid: { type: String, default: uuid() },
        size: { type: Number, default: 0 },
        createdAt: { type: Date, required: true, default: new Date() },
        updatedAt: { type: Date, required: true, default: new Date() },
        status: { type: String, default: 'UNAVAILABLE', enum: ['UNAVAILABLE', 'UPLOADING', 'AVAILABLE'] },
        hash: { type: String, default: null },
        entries: [{
            path:  String,
            size: Number,
            hash: String,
        }],
    },
    content: { type: mongoose.Schema.Types.ObjectId, ref: 'Binary' }
}

var solutionSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    runtimeName: { type: String },
    runtimeVersion: { type: String },
    runtimeArguments: [{
        key: { type: String, required: true },
        value: { type: String },
    }],
    state: { type: String, required: true, default: 'STOPPED' },
    binaries: {
        totalSize: { type: Number, default: 0 },
        status: { type: String, default: 'UNAVAILABLE', enum: ['UNAVAILABLE', 'UPLOADING', 'PROCESSING', 'DEPLOYED', 'FAILED'] },
        files: [ binarySchema ],
    },
});

solutionSchema.method({
    getState: function getState(verbose) {
        var solution = this;
        var result = {
            state: solution.state
        };
        if (verbose) {
            result.urls = solution.urls || [];
            result.processes = solution.processes || [];
        }
        return result;
    }
});


var accountSchema = new mongoose.Schema({
    name : { type : String, required: true, unique: true },
    solutions: [ solutionSchema ],
});

accountSchema.method({
    uuid: uuid,
});


//var Solution = mongoose.model('Solution', solutionSchema);
var Account = mongoose.model('Account', accountSchema);

module.exports = Account;
