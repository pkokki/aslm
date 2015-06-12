var _ = require('underscore')._;
var Account = require('./models/account');

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
        var s001 = getSolutionTemplate('s001', new Date(2015, 6, 10, 0, 0, 0, 0));
        var s002 = getSolutionTemplate('s002', new Date(2015, 6, 11, 0, 0, 0, 0), 'STARTED');
        var s003 = getSolutionTemplate('s003');
        var s004 = getSolutionTemplate('s004');
        var running1 = getSolutionTemplate('running1', null, 'STARTED');
        var running2 = getSolutionTemplate('running2', null, 'STARTED');
        var stopped1 = getSolutionTemplate('stopped1');
        var stopped2 = getSolutionTemplate('stopped2');
        var sbin = getSolutionTemplate('sbin');
        sbin.binaries = {
            totalSize: 1234,
            status: 'DEPLOYED',
            files: [
                { properties: { path: 'example1.zip', pathGuid: 'ZXhhbXBsZTIud2Fy', size: 1230, status: 'AVAILABLE', hash: 'F6E792574CB4F94E17D677DCC27809C0D43B8AC9' } },
                { properties: { path: 'example2.zip', pathGuid: 'ZXhhbXBsZTEud2Fy', size: 4, status: 'AVAILABLE', hash: 'E9856D0DD103D59A7CA563D919D983470D81E004' } },
            ]
        };

        var account = {
            name: '123',
            solutions: [ /*s001, s002, */s003, s004, running1, running2, stopped1, stopped2, sbin]
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
    console.log('initializing test data...')

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

    app.post('/api/accounts/:accountName/solutions/:solutionName/binaries', function(req, res) {
        var accountName = req.params.accountName;
        var solutionName = req.params.solutionName;
        var reqBinaries = req.body;
        findSolution(accountName, solutionName, function(err, solution, account) {
            if (err) {
                res.status(err.status).json(err);
            }
            else {
                if (reqBinaries && _.isArray(reqBinaries.files) && reqBinaries.files.length > 0)
                {
                    if (!solution.binaries) {
                        solution.binaries = {
                            totalSize: 0,
                            status: 'UNAVAILABLE',
                            files: [],
                        };
                    }
                    for (var i = 0; i < reqBinaries.files.length; i++) {
                        var reqFile = reqBinaries.files[i];
                        if (typeof reqFile.path == 'string') {
                            var file = _.find(solution.binaries.files, function(el) { return el.path == reqFile.path });
                            if (file == null) {
                                file = {
                                    properties: {
                                        path: reqFile.path,
                                        status: 'UNAVAILABLE',
                                    }
                                }
                                binaries.files.push(file);
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
                            var updated = _.find(account.solutions, function(s) { return s.name == solutionName; });
                            var result = updated.binaries;
                            res.json(result);
                        }
                    });
                }
                else {
                    res.status(409).json(errors.NO_BINARIES_SUPPLIED);
                }
            }
        });
    });
};
