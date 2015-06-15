var _ = require('underscore')._;
var Account = require('./models/account');
var Binary = require('./models/binary');

var errors = {
    create: function(err) {
        return {
            status: 500,
            code: 500,
            description: err || 'Internal Server Error.'
        };
    },

    ACCOUNT_NOT_FOUND: { status: 404, code: 1001, description: 'account not found' },

    INVALID_SOLUTION: { status: 400, code: 1100, description: 'solution can not be parsed' },
    INVALID_SOLUTION_URL: { status: 400, code: 1101, description: 'solution url is invalid' },
    SOLUTION_NAME_EXISTS: { status: 409, code: 1102, description: 'solution %s already exists' },
    INVALID_STATE_SUBMITTED: { status: 400, code: 1103, description: 'invalid state data' },
    SOLUTION_NOT_FOUND: { status: 404, code: 1104, description: 'solution not found' },
    SOLUTION_MUST_BE_STOPPED: { status: 409, code: 1105, description: 'solution is not stopped' },
    SOLUTION_OPERATION_IN_PROGRESS: { status: 409, code: 1106, description: 'there is an ongoing operation (deploy, start, etc.) with this solution' },
    SOLUTION_ALREADY_IN_STATE: { status: 409, code: 1107, description: 'solution is already in state %s' },
    NO_BINARIES_SUPPLIED: { status: 409, code: 1108, description: 'no files found in request body' },
    NO_PATH_FOR_BINARY_SUPPLIED: { status: 409, code: 1109, description: 'a file should have a valid path property' },
    BINARIES_ALREADY_CREATED: { status: 409, code: 1110, description: 'binaries are already created' },
    BINARY_PATH_NOT_FOUND: { status: 409, code: 1111, description: 'binary path not found' },
};



function getSolutionTemplate(name, timestamp, state) {
    return {
        name: name,
        url: '/' + name,
        createdAt: timestamp || new Date(),
        updatedAt: timestamp || new Date(),
        runtimeName: 'atlas',
        runtimeVersion: '5.0',
        runtimeArguments: [],
        state: state || 'STOPPED',
    };
}



function initCreateAccount(err) {
    if (err)
        console.log('failed to remove existing account: ' + err);
    else {
        var account = {
            name: '123',
            solutions: [ /*s001, s002, s003, s004, running1, running2, stopped1, stopped2,sbin */]
        };
        Account.create(account, function(err) {
            if (err)
                console.log('failed to finish initialization: ' + err);
            else
                console.log('initialized')
        });
    }
}

function init() {
    console.log('initializing test account...')
    Account.findOne({ 'name': '123' }, 'solutions', function(err, account) {
        if (err) {
            console.log('failed to initialize: ' + err)
        }
        else {
            if (account) {
                Account.remove({ _id: account._id }, initCreateAccount);
            }
            else {
                initCreateAccount(null, 0);
            }
        }
    });
}


function isValidUrl(url) {
    if (url.indexOf(' ') > 0) return false;
    return true;
}

function findAccount(accountName, next) {
    Account.findOne({ 'name': accountName }, function(err, account) {
        if (err) {
            next(errors.create(err), null);
        }
        else if (!account) {
            next(errors.ACCOUNT_NOT_FOUND, null);
        }
        else {
            next(null, account);
        }
    });
}

function findSolution(accountName, solutionName, next) {
    Account.findOne({ 'name': accountName }, 'solutions', function(err, account) {
        if (err) {
            next(errors.create(err), null);
        }
        else if (!account) {
            next(errors.ACCOUNT_NOT_FOUND, null);
        }
        else {
            if (account.solutions) {
                var solution = _.find(account.solutions, function(s) { return s.name == solutionName; });
                if (solution) {
                    next(null, solution, account);
                    return;
                }
            }
            next(errors.SOLUTION_NOT_FOUND, null);
        }
    });
}

module.exports = function(app) {
    init();

    app.get('/api/accounts/:accountName/solutions', function(req, res) {
        var accountName = req.params.accountName;
        findAccount(accountName, function(err, account) {
            if (err)
                res.status(err.status).json(err);
            else
                res.json(account.solutions);
        });
    });

    app.post('/api/accounts/:accountName/solutions', function(req, res) {
        var accountName = req.params.accountName;
        var solution = req.body;
        findAccount(accountName, function(err, account) {
            if (err)
                res.status(err.status).json(err);
            else {
                if (typeof solution != 'object' || typeof solution.name != 'string') {
                    res.status(400).json(errors.INVALID_SOLUTION);
                }
                else if (typeof solution.url != 'string' || !isValidUrl(solution.url)) {
                    res.status(400).json(errors.INVALID_SOLUTION_URL);
                }
                else if (_.find(account.solutions, function(el) { return el.name == solution.name })) {
                    res.status(409).json(errors.SOLUTION_NAME_EXISTS);
                }
                else {
                    var entity = _.extend(getSolutionTemplate(), solution);
                    account.solutions.push(entity);
                    account.save(function(err, account) {
                        if (err)
                            res.status(500).json(errors.create(err));
                        else {
                            var created = _.find(account.solutions, function(s) { return s.name == entity.name; });
                            res.status(201).json(created);
                        }
                    });
                }
            }
        });
    });

    app.get('/api/accounts/:accountName/solutions/:solutionName', function(req, res) {
        var accountName = req.params.accountName;
        var solutionName = req.params.solutionName;
        findSolution(accountName, solutionName, function(err, solution) {
            if (err) {
                res.status(err.status).json(err);
            }
            else {
                res.json(solution);
            }
        });
    });

    app.put('/api/accounts/:accountName/solutions/:solutionName', function(req, res) {
        var accountName = req.params.accountName;
        var solutionName = req.params.solutionName;
        var newData = req.body;
        findSolution(accountName, solutionName, function(err, solution, account) {
            if (err) {
                res.status(err.status).json(err);
            }
            else {
                if (typeof newData != 'object' || Object.keys(newData).length == 0) {
                    res.status(400).json(errors.INVALID_SOLUTION);
                }
                else if (solution.state != 'STOPPED') {
                    res.status(409).json(errors.SOLUTION_MUST_BE_STOPPED);
                }
                else {
                    _.extend(solution, newData);
                    account.save(function(err, account) {
                        if (err)
                            res.status(500).json(errors.create(err));
                        else {
                            var updated = _.find(account.solutions, function(s) { return s.name == (newData.name || solutionName); });
                            res.status(200).json(updated);
                        }
                    });
                }
            }
        });
    });

    app.delete('/api/accounts/:accountName/solutions/:solutionName', function(req, res) {
        var accountName = req.params.accountName;
        var solutionName = req.params.solutionName;
        findSolution(accountName, solutionName, function(err, solution, account) {
            if (err) {
                res.status(err.status).json(err);
            }
            else {
                if (solution.state != 'STOPPED') {
                    res.status(409).json(errors.SOLUTION_MUST_BE_STOPPED);
                }
                else {
                    var files = account.solutions.id(solution._id).binaries.files;
                    for (var i = 0; i < files.length; i++) {
                        var binId = files[i].content;
                        Binary.findByIdAndRemove(binId, function () {});
                    }
                    account.solutions.id(solution._id).remove();
                    account.save(function (err) {
                        if (err)
                            res.status(500).json(errors.create(err));
                        else
                            res.status(204).json({});
                    });
                }
            }
        });
    });

    app.get('/api/accounts/:accountName/solutions/:solutionName/state', function(req, res) {
        var accountName = req.params.accountName;
        var solutionName = req.params.solutionName;
        var verbose = (req.query.verbose == 'true');
        findSolution(accountName, solutionName, function(err, solution) {
            if (err) {
                res.status(err.status).json(err);
            }
            else {
                var result = solution.getState(verbose);
                res.json(result);
            }
        });
    });

    app.put('/api/accounts/:accountName/solutions/:solutionName/state', function(req, res) {
        var accountName = req.params.accountName;
        var solutionName = req.params.solutionName;
        var reqData = req.body;
        findSolution(accountName, solutionName, function(err, solution, account) {
            if (err) {
                res.status(err.status).json(err);
            }
            else {
                if (typeof reqData != 'object' || Object.keys(reqData).length != 1 || !reqData.state) {
                    res.status(400).json(errors.INVALID_STATE_SUBMITTED);
                }
                else if (solution.state != 'STOPPED' && solution.state != 'STARTED') {
                    res.status(409).json(errors.SOLUTION_OPERATION_IN_PROGRESS);
                }
                else if (solution.state == reqData.state) {
                    res.status(409).json(errors.SOLUTION_ALREADY_IN_STATE);
                }
                else {
                    solution.state = reqData.state;
                    account.save(function(err, account) {
                        if (err)
                            res.status(500).json(errors.create(err));
                        else {
                            var updated = _.find(account.solutions, function(s) { return s.name == solutionName; });
                            var result = updated.getState(false);
                            res.json(result);
                        }
                    });
                }
            }
        });
    });

    app.get('/api/accounts/:accountName/solutions/:solutionName/binaries', function(req, res) {
        var accountName = req.params.accountName;
        var solutionName = req.params.solutionName;
        findSolution(accountName, solutionName, function(err, solution, account) {
            if (err) {
                res.status(err.status).json(err);
            }
            else {
                var result = solution.binaries;
                res.json(result);
            }
        });
    });

    function setSolutionFiles(res, solution, account, reqBinaries, successStatus) {
        if (reqBinaries && _.isArray(reqBinaries.files) && reqBinaries.files.length > 0)
        {
            solution.binaries.files = [];
            for (var i = 0; i < reqBinaries.files.length; i++) {
                var reqFile = reqBinaries.files[i];
                if (typeof reqFile.path == 'string') {
                    var file = _.find(solution.binaries.files, function(el) { return el.path == reqFile.path });
                    if (file == null) {
                        file = {
                            path: reqFile.path,
                            status: 'UNAVAILABLE',
                        }
                        solution.binaries.files.push(file);
                    }
                    file.pathGuid = account.uuid();
                }
                else {
                    res.status(409).json(errors.NO_PATH_FOR_BINARY_SUPPLIED);
                    return;
                }
            }

            account.save(function(err, account) {
                if (err)
                    res.status(500).json(errors.create(err));
                else {
                    var updated = _.find(account.solutions, function(s) { return s.name == solution.name; });
                    var result = updated.binaries;
                    res.status(successStatus).json(result);
                }
            });
        }
        else {
            res.status(400).json(errors.NO_BINARIES_SUPPLIED);
        }
    }

    app.post('/api/accounts/:accountName/solutions/:solutionName/binaries', function(req, res) {
        var accountName = req.params.accountName;
        var solutionName = req.params.solutionName;
        var reqBinaries = req.body;
        findSolution(accountName, solutionName, function(err, solution, account) {
            if (err) {
                res.status(err.status).json(err);
            }
            else {
                if (solution.binaries.files.length == 0) {
                    setSolutionFiles(res, solution, account, reqBinaries, 201);
                }
                else {
                    res.status(409).json(errors.BINARIES_ALREADY_CREATED);
                }

            }
        });
    });

    app.put('/api/accounts/:accountName/solutions/:solutionName/binaries', function(req, res) {
        var accountName = req.params.accountName;
        var solutionName = req.params.solutionName;
        var reqBinaries = req.body;
        findSolution(accountName, solutionName, function(err, solution, account) {
            if (err) {
                res.status(err.status).json(err);
            }
            else {
                setSolutionFiles(res, solution, account, reqBinaries, 200);
            }
        });
    });

    app.put('/api/accounts/:accountName/solutions/:solutionName/binaries/:pathGuid', function(req, res) {
        var accountName = req.params.accountName;
        var solutionName = req.params.solutionName;
        var pathGuid = req.params.pathGuid;
        var content = req.body.toString();
        findSolution(accountName, solutionName, function(err, solution, account) {
            if (err) {
                res.status(err.status).json(err);
            }
            else {
                var file = _.find(solution.binaries.files, function(el) { return el.pathGuid == pathGuid; });
                if (file) {
                    file.pathGuid = null;
                    file.status = 'AVAILABLE';
                    var buffer = new Buffer(content);
                    Binary.create({ content: buffer }, function(err, binary) {
                        if (err) {
                            res.status(500).json(errors.create(err));
                        }
                        else {
                            file.content = binary._id;
                            account.save(function(err, account) {
                                if (err) {
                                    res.status(500).json(errors.create(err));
                                }
                                else {
                                    var updatedSolution = _.find(account.solutions, function(o) { return o.name == solution.name; });
                                    var updatedFile = _.find(updatedSolution.binaries.files, function (o) { return o.path == file.path; });
                                    res.status(200).json(updatedFile);
                                }
                            });
                        }
                    });
                }
                else {
                    res.status(404).json(errors.BINARY_PATH_NOT_FOUND);
                }
            }
        });
    });
};
