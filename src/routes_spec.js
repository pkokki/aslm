var frisby = require('frisby');
var url = 'http://localhost:3000/api';
var existingAccountName = '123';
var existingAccountUrl = url + '/accounts/' + existingAccountName;
var notExistingAccountUrl = url + '/accounts/000';

function assertError(code, description) {
    return function(err) {
        expect(err).not.toBeNull();
        if (code)
            expect(err.code).toEqual(code);
        else
            throw 'assertError: no code is provided';

        if (description)
            expect(err.description).toEqual(description);
        else
            expect(err.description).toBeDefined();
    }
}

function assertAccessForbidden() {
    return assertError(1003, 'auth failed');
}

frisby.create('pre')
    .post(existingAccountUrl + '/solutions', { name: 's1', url: '/s1' })
    .afterJSON(function() {
        frisby.create('should GET all solutions')
            .get(existingAccountUrl + '/solutions')
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .afterJSON(function(solutions) {
                expect(solutions.length >= 1).toEqual(true);
                frisby.create('tidyup').delete(existingAccountUrl + '/solutions/s1').expectStatus(204).toss();

            }).toss();
    }).toss();
frisby.create('should fail with 404 to GET all solutions for not existing account')
    .get(notExistingAccountUrl + '/solutions')
    .expectStatus(404)
    .afterJSON(assertError(1001, 'account not found'))
    .toss();
/*
frisby.create('should fail with 403 to GET all solutions if auth header is invalid')
    .get(existingAccountUrl + '/solutions')
    .expectStatus(403)
    .afterJSON(assertAccessForbidden())
    .toss();
*/

frisby.create('should succeed to POST a solution')
    .post(existingAccountUrl + '/solutions', {
        name: 'new001',
        url: '/new001'
    })
    .expectStatus(201)
    .afterJSON(function(json) {
        expect(json.name).toEqual('new001');
        expect(json.url).toEqual('/new001');
        expect(toString.call(new Date(json.createdAt))).toEqual('[object Date]');
        expect(toString.call(new Date(json.updatedAt))).toEqual('[object Date]');
        expect(json.runtimeName).toEqual('atlas');
        expect(json.runtimeVersion).toEqual('5.0');
        expect(json.runtimeArguments).toEqual([]);

        expect(json.binaries).toBeDefined();
        expect(json.binaries.totalSize).toEqual(0);
        expect(json.binaries.status).toEqual('UNAVAILABLE');
        expect(json.binaries.failMessage).toBeUndefined();
        expect(json.binaries.warningMessage).toBeUndefined();
        expect(json.binaries.files.length).toEqual(0);

        frisby.create('tidyup: should succeed to POST a solution').delete(existingAccountUrl + '/solutions/new001').expectStatus(204).toss();
    })
    .toss();

function deleteSolution(name, next) {
    return function(json) {
        if (!name) {
            name = json.name;
        }
        else if (typeof name == 'function') {
            next = name;
            name = json.name;
        }
        frisby.create('deleteSolution ' + name).delete(existingAccountUrl + '/solutions/' + name).expectStatus(204).toss();
        if (next) {
            next(json);
        }
    }
}

frisby.create('should adhere to the naming conventions for solution names: the name must contain no more than 30 characters')
    .post(existingAccountUrl + '/solutions', { name: 's123456789012345678901234567890', url: '/xxxxx' }).expectStatus(400).afterJSON(assertError(1112)).toss();
frisby.create('should adhere to the naming conventions for solution names: the name must contain no more than 30 characters')
    .post(existingAccountUrl + '/solutions', { name: 's12345678901234567890123456789', url: '/xxxxx' }).expectStatus(201).afterJSON(deleteSolution()).toss();
frisby.create('should adhere to the naming conventions for solution names: the name must contain only lowercase alphanumeric characters')
    .post(existingAccountUrl + '/solutions', { name: 'thename#', url: '/xxxxx' }).expectStatus(400).afterJSON(assertError(1112)).toss();
frisby.create('should adhere to the naming conventions for solution names: the name must contain only lowercase alphanumeric characters')
    .post(existingAccountUrl + '/solutions', { name: 'THENAME', url: '/xxxxx' }).expectStatus(400).afterJSON(assertError(1112)).toss();
frisby.create('should adhere to the naming conventions for solution names: the name must contain only lowercase alphanumeric characters')
    .post(existingAccountUrl + '/solutions', { name: 'aname!', url: '/xxxxx' }).expectStatus(400).afterJSON(assertError(1112)).toss();
frisby.create('should adhere to the naming conventions for solution names: the name must start with a letter')
    .post(existingAccountUrl + '/solutions', { name: '1name', url: '/xxxxx' }).expectStatus(400).afterJSON(assertError(1112)).toss();

frisby.create('should succeed to POST a solution with binaries')
    .post(existingAccountUrl + '/solutions', {
        name: 'newwithbinaries',
        url: '/newwithbinaries',
        binaries: {
            totalSize: 1234,
            files: [ { path: 'p1.txt' }, { path: 'p2.txt' } ]
        }
    })
    .expectStatus(201)
    .afterJSON(function(json) {
        expect(json.binaries.totalSize).toEqual(1234);
        expect(json.binaries.files.length).toEqual(2);
        expect(json.binaries.files[0].path).toEqual('p1.txt');
        expect(json.binaries.files[0].pathGuid.length).toEqual(36);
        expect(toString.call(new Date(json.binaries.files[0].createdAt))).toEqual('[object Date]');
        expect(toString.call(new Date(json.binaries.files[0].updatedAt))).toEqual('[object Date]');
        expect(json.binaries.files[0].size).toEqual(0);
        expect(json.binaries.files[0].status).toEqual('UNAVAILABLE');
        expect(json.binaries.files[0].hash).toBeNull();
        expect(json.binaries.files[1].path).toEqual('p2.txt');

        frisby.create('tidy up')
            .delete(existingAccountUrl + '/solutions/newwithbinaries')
            .expectStatus(204)
            .toss();
    })
    .toss();
frisby.create('pre')
    .post(existingAccountUrl + '/solutions', { name: 'runningsolution3', url: '/runningsolution3' })
    .afterJSON(function() {
        frisby.create('should fail with 409 to POST a solution if the solution is already exists')
            .post(existingAccountUrl + '/solutions', {
                name: 'runningsolution3',
                url: '/xxxxx'
            })
            .expectStatus(409)
            .afterJSON(function() {
                assertError(1102);
                frisby.create('tidyup').delete(existingAccountUrl + '/solutions/runningsolution3').expectStatus(204).toss();
            })
            .toss();
    })
	.toss();
frisby.create('should fail with 404 to POST a solution in a not existing account')
    .post(notExistingAccountUrl + '/solutions', {
        name: 'sol1'
    })
    .expectStatus(404)
    .afterJSON(assertError(1001))
    .toss();
frisby.create('should fail with 400 to POST a solution if the request body cannot be parsed')
    .post(existingAccountUrl + '/solutions', '{ this is invalid json! }')
    .expectStatus(400)
    .afterJSON(assertError(1100))
    .toss();
frisby.create('should fail with 400 to POST a solution if the resource URL is invalid')
    .post(existingAccountUrl + '/solutions', {
        name: 'validsolutionname',
        url: '/xxxxx xxxxxx'
    })
    .expectStatus(400)
    .afterJSON(assertError(1101))
    .toss();
/*
frisby.create('should fail with 403 to POST a solution if auth header is invalid')
    .post(notExistingAccountUrl + '/solutions', {
        name: 'sol1'
    })
    .expectStatus(403)
    .afterJSON(assertAccessForbidden())
    .toss();
*/
frisby.create('pre: should succeed to GET an existing solution')
    .post(existingAccountUrl + '/solutions', { name: 's001', url: '/s001' })
    .afterJSON(function(js) {
        frisby.create('should succeed to GET an existing solution')
            .get(existingAccountUrl + '/solutions/s001')
            .expectStatus(200)
            .afterJSON(function(json) {
                expect(json.name).toEqual('s001');
                expect(json.url).toEqual('/s001');
                expect(toString.call(new Date(json.createdAt))).toEqual('[object Date]');
                expect(toString.call(new Date(json.updatedAt))).toEqual('[object Date]');
                expect(json.runtimeName).toEqual('atlas');
                expect(json.runtimeVersion).toEqual('5.0');
                expect(json.runtimeArguments).toEqual([]);
                frisby.create('tidyup').delete(existingAccountUrl + '/solutions/s001').toss();
            })
            .toss();
    })
    .toss();
frisby.create('should fail with 404 to GET a not existing solution in an existing account')
    .get(existingAccountUrl + '/solutions/xxxxx')
    .expectStatus(404)
    .afterJSON(assertError(1104))
    .toss();
/*
frisby.create('should fail with 403 to GET an existing solution if auth header is invalid')
    .get(existingAccountUrl + '/solutions/s001')
    .expectStatus(403)
    .afterJSON(assertAccessForbidden())
    .toss();
*/

frisby.create('should succeed to PUT an existing solution')
    .post(existingAccountUrl + '/solutions', { name: 'toupdate', url: '/toupdate' })
    .afterJSON(function(js) {
        frisby.create('chain: should succeed to PUT an existing solution')
            .put(existingAccountUrl + '/solutions/toupdate', { name: 'updated' })
            .expectStatus(200)
            .afterJSON(function(json) {
                expect(json.name).toEqual('updated');
                expect(json.url).toEqual('/toupdate');
                frisby.create('tidyup').delete(existingAccountUrl + '/solutions/updated').toss();
            })
            .toss();
    })
    .toss();
frisby.create('should fail with 400 to PUT a solution if the request body cannot be parsed')
    .put(existingAccountUrl + '/solutions/s001', '{ this is invalid json! }')
    .expectStatus(400)
    .afterJSON(assertError(1100))
    .toss();
frisby.create('should fail with 404 to PUT a not existing solution in an existing account')
    .put(existingAccountUrl + '/solutions/xxxxx', { name: 'updated' })
    .expectStatus(404)
    .afterJSON(assertError(1104))
    .toss();
frisby.create('should fail with 409 to PUT a solution, if application is running').post(existingAccountUrl + '/solutions', { name: 'runningsolution', url: '/runningsolution' }).afterJSON(function() {
    frisby.create('pre').put(existingAccountUrl + '/solutions/runningsolution/state', { state: 'STARTED' }).afterJSON(function() {
        frisby.create('should fail with 409 to PUT a solution, if application is running')
            .put(existingAccountUrl + '/solutions/runningsolution', { name: 'updated' })
            .expectStatus(409)
            .afterJSON(function(json) {
                assertError(1105)(json);
                frisby.create('tidyup').put(existingAccountUrl + '/solutions/runningsolution/state', { state: 'STOPPED'})
                    .expectStatus(200)
                    .afterJSON(function() {
                        frisby.create('tidyup').delete(existingAccountUrl + '/solutions/runningsolution').toss();
                    }).toss();
            })
            .toss();
        }).toss();
    }).toss();
/*
frisby.create('should fail with 403 to PUT an existing solution if auth header is invalid')
    .put(existingAccountUrl + '/solutions/s001')
    .expectStatus(403)
    .afterJSON(assertAccessForbidden())
    .toss();
*/
frisby.create('should succeed to DELETE an existing solution')
    .post(existingAccountUrl + '/solutions', { name: 'todelete', url: '/todelete' })
    .afterJSON(function() {
        frisby.create('chain: should succeed to DELETE an existing solution')
            .delete(existingAccountUrl + '/solutions/todelete')
            .expectStatus(204)
            .toss();
    })
    .toss();

frisby.create('pre: should fail with 409 to DELETE an existing solution, if application is running')
    .post(existingAccountUrl + '/solutions', { name: 'runningsolution2', url: '/runningsolution2' })
    .afterJSON(function() {
        frisby.create('pre').put(existingAccountUrl + '/solutions/runningsolution2/state', { state: 'STARTED' }).afterJSON(function(json) {
            frisby.create('should fail with 409 to DELETE an existing solution, if application is running')
                .delete(existingAccountUrl + '/solutions/runningsolution2')
                .expectStatus(409)
                .afterJSON(function(json) {
                    assertError(1105)(json);
                    frisby.create('tidyup').put(existingAccountUrl + '/solutions/runningsolution2/state', { state: 'STOPPED'}).afterJSON(function() {
                        frisby.create('tidyup').delete(existingAccountUrl + '/solutions/runningsolution2').toss();
                    }).toss();

                })
                .toss();
        }).toss()
    }).toss();
frisby.create('should fail with 404 to DELETE a not existing solution in an existing account')
    .delete(existingAccountUrl + '/solutions/xxxxx')
    .expectStatus(404)
    .afterJSON(assertError(1104))
    .toss();
/*
frisby.create('should fail with 403 to DELETE an existing solution if auth header is invalid')
    .delete(existingAccountUrl + '/solutions/s001')
    .expectStatus(403)
    .afterJSON(assertAccessForbidden())
    .toss();
*/
frisby.create('should succeed to GET the state of a solution')
    .post(existingAccountUrl + '/solutions', { name: 'state1', url: '/state1' })
    .afterJSON(function() {
        frisby.create('should succeed to GET the state of a solution')
            .get(existingAccountUrl + '/solutions/state1/state')
            .expectStatus(200)
            .afterJSON(function(json) {
                expect(json.state).toEqual('STOPPED');
                expect(json.urls).toBeUndefined();
                expect(json.processes).toBeUndefined();
                frisby.create('should succeed to GET the state of a solution')
                    .expectStatus(204)
                    .delete(existingAccountUrl + '/solutions/state1')
                    .toss();
            }).toss()
    })
    .toss();
frisby.create('should succeed to GET the state with details of a solution')
    .post(existingAccountUrl + '/solutions', { name: 'state2', url: '/state2' })
    .afterJSON(function(json) {
        frisby.create('should succeed to GET the state with details of a solution')
            .get(existingAccountUrl + '/solutions/state2/state?verbose=true')
            .expectStatus(200)
            .afterJSON(function(json) {
                expect(json.state).toEqual('STOPPED');
                expect(json.urls).toBeDefined();
                expect(json.processes).toBeDefined();
                frisby.create('should succeed to GET the state with details of a solution')
                    .delete(existingAccountUrl + '/solutions/state2')
                    .expectStatus(204)
                    .toss();
            })
            .toss();
    })
    .toss();
frisby.create('should fail with 404 to GET the state of not existing solution')
    .get(existingAccountUrl + '/solutions/xxxxx/state')
    .expectStatus(404)
    .afterJSON(assertError(1104))
    .toss();
/*
frisby.create('should fail with 403 to GET the state if auth header is invalid')
    .get(existingAccountUrl + '/solutions/s001/state')
    .expectStatus(403)
    .afterJSON(assertAccessForbidden())
    .toss();
*/
frisby.create('pre: should succeed to stop a STARTED solution')
    .post(existingAccountUrl + '/solutions', { name: 'running1', url: '/running1' })
    .afterJSON(function(json) {
        frisby.create('pre: should succeed to stop a STARTED solution')
            .put(existingAccountUrl + '/solutions/running1/state', { state: 'STARTED' })
            .afterJSON(function(json) {
                frisby.create('should succeed to stop a STARTED solution')
                    .put(existingAccountUrl + '/solutions/running1/state', { state: 'STOPPED' })
                    .expectStatus(200)
                    .afterJSON(function(json) {
                        expect(json.state).toEqual('STOPPED');
                        frisby.create('should succeed to start a STOPPED solution')
                            .put(existingAccountUrl + '/solutions/running1/state', { state: 'STARTED' })
                            .expectStatus(200)
                            .afterJSON(function(json) {
                                expect(json.state).toEqual('STARTED');
                                frisby.create('after: should fail to start a STARTED solution')
                                    .put(existingAccountUrl + '/solutions/running1/state', { state: 'STOPPED' })
                                    .toss();
                                frisby.create('should succeed to stop a STARTED solution')
                                    .delete(existingAccountUrl + '/solutions/running1')
                                    .expectStatus(204)
                                    .toss();
                            })
                            .toss();
                    })
                    .toss();
            })
            .toss();
    })
    .toss();
frisby.create('should fail to start a STARTED solution')
    .post(existingAccountUrl + '/solutions', { name: 'running2', url: '/running2' })
    .afterJSON(function(json) {
        frisby.create('pre: should fail to start a STARTED solutionn')
            .put(existingAccountUrl + '/solutions/running2/state', { state: 'STARTED' })
            .afterJSON(function(json) {
        frisby.create('should fail to start a STARTED solution')
            .put(existingAccountUrl + '/solutions/running2/state', { state: 'STARTED' })
            .expectStatus(409)
            .afterJSON(function(json) {
                assertError(1107)(json);
                frisby.create('after: should fail to start a STARTED solution')
                    .put(existingAccountUrl + '/solutions/running2/state', { state: 'STOPPED' })
                    .toss();
                frisby.create('after: should fail to start a STARTED solution')
                    .delete(existingAccountUrl + '/solutions/running2')
                    .expectStatus(204)
                    .toss();
            })
            .toss();
        })
        .toss();
    })
    .toss();
frisby.create('should fail to stop a STOPPED solution')
    .post(existingAccountUrl + '/solutions', { name: 'stopped2', url: '/stopped2' })
    .afterJSON(function(json) {
        frisby.create('should fail to stop a STOPPED solution')
            .put(existingAccountUrl + '/solutions/stopped2/state', { state: 'STOPPED' })
            .expectStatus(409)
            .afterJSON(function(json) {
                assertError(1107)(json);
                frisby.create('after: should fail to stop a STOPPED solution')
                    .delete(existingAccountUrl + '/solutions/stopped2')
                    .expectStatus(204)
                    .toss();
            })
            .toss();
    })
    .toss();
/*
frisby.create('should fail with 403 to PUT the state if auth header is invalid')
    .put(existingAccountUrl + '/solutions/s001/state', { state: 'STARTED' })
    .expectStatus(403)
    .afterJSON(assertAccessForbidden())
    .toss();
*/
frisby.create('pre: should get the binaries of solution')
    .post(existingAccountUrl + '/solutions', { name: 'sbin', url: '/sbin', binaries: {
        totalSize: 1234,
        status: 'DEPLOYED',
        files: [
            { path: 'example1.zip', pathGuid: 'ZXhhbXBsZTIud2Fy', size: 1230, status: 'AVAILABLE', hash: 'F6E792574CB4F94E17D677DCC27809C0D43B8AC9' },
            { path: 'example2.zip', pathGuid: 'ZXhhbXBsZTEud2Fy', size: 4, status: 'AVAILABLE', hash: 'E9856D0DD103D59A7CA563D919D983470D81E004' },
        ]
    }})
    .afterJSON(function(json) {
        frisby.create('should get the binaries of solution')
            .get(existingAccountUrl + '/solutions/sbin/binaries')
            .expectStatus(200)
            .afterJSON(function(json) {
                expect(json.totalSize).toBeDefined();
                expect(json.status).toEqual('DEPLOYED');
                expect(json.files).toBeDefined();
                expect(json.files[0].path).toBeDefined();
                expect(json.files[0].pathGuid).toBeDefined();
                expect(json.files[0].size).toBeDefined();
                expect(json.files[0].status).toEqual('AVAILABLE');
                expect(json.files[0].hash).toBeDefined();
                frisby.create('after: should get the binaries of solution')
                    .delete(existingAccountUrl + '/solutions/sbin')
                    .expectStatus(204)
                    .toss();
            })
            .toss();
    })
    .toss();
frisby.create('should fail with 404 to get the binaries of not existing solution')
    .get(existingAccountUrl + '/solutions/xxxxxxxx/binaries')
    .expectStatus(404)
    .afterJSON(assertError(1104))
    .toss();
/*
frisby.create('should fail with 403 to GET the binaries if auth header is invalid')
    .get(existingAccountUrl + '/solutions/s001/binaries')
    .expectStatus(403)
    .afterJSON(assertAccessForbidden())
    .toss();
*/

frisby.create('pre: should succeed to POST binaries')
    .post(existingAccountUrl + '/solutions', { name: 'sbin1', url: '/sbin1' })
    .afterJSON(function() {
        var binaries = {
            files: [
                { path: 'p1.zip' },
                { path: 'p2.zip' },
            ]
        };
        frisby.create('should succeed to POST binaries')
            .post(existingAccountUrl + '/solutions/sbin1/binaries', binaries)
            .expectStatus(201)
            .afterJSON(function(json) {
                expect(json.files.length).toEqual(2);
                expect(json.files[0].path).toEqual('p1.zip');
                expect(json.files[0].pathGuid.length).toEqual(36);
                expect(json.files[0].status).toEqual('UNAVAILABLE');
                expect(json.files[1].path).toEqual('p2.zip');
                frisby.create('tidy: should succeed to POST binaries').delete(existingAccountUrl + '/solutions/sbin1').expectStatus(204).toss();
            })
            .toss();
    })
    .toss();

frisby.create('pre: should fail with 409 to POST binaries, if binaries are already created')
    .post(existingAccountUrl + '/solutions', { name: 'sbin3', url: '/sbin3', binaries: {
        files: [
            { path: 'p1.zip' },
            { path: 'p2.zip' },
        ]
    }})
    .afterJSON(function() {
        var binaries = { files: [ { path: 'p3.zip' } ] };
        frisby.create('should fail with 409 to POST binaries, if binaries are already created')
            .post(existingAccountUrl + '/solutions/sbin1/binaries', binaries)
            .expectStatus(409)
            .afterJSON(function(json) {
                assertError(1110)(json);
                frisby.create('tidy: should fail with 409 to POST binaries, if binaries are already created').delete(existingAccountUrl + '/solutions/sbin3').expectStatus(204).toss();
            })
            .toss();
    })
    .toss();

frisby.create('pre: should fail to POST binaries if request body cannot be parsed')
    .post(existingAccountUrl + '/solutions', { name: 'sbin2', url: '/sbin2' })
    .afterJSON(function() {
        frisby.create('should fail to POST binaries if request body cannot be parsed')
            .post(existingAccountUrl + '/solutions/sbin2/binaries', {})
            .expectStatus(400)
            .afterJSON(function(json) {
                assertError(1108)(json);
                frisby.create('tidy: should fail to POST binaries if request body cannot be parsed').delete(existingAccountUrl + '/solutions/sbin2').expectStatus(204).toss();
            })
            .toss();
    })
    .toss();
/*
frisby.create('should fail with 403 to POST binaries if auth header is invalid')
    .post(existingAccountUrl + '/solutions/s001/binaries')
    .expectStatus(403)
    .afterJSON(assertAccessForbidden())
    .toss();
*/

frisby.create('pre: should succeed to PUT binaries')
    .post(existingAccountUrl + '/solutions', { name: 'sbin4', url: '/sbin4', binaries: {
        files: [
            { path: 'p1.zip' },
            { path: 'p2.zip' },
        ]
    }})
    .afterJSON(function() {
        var new_binaries = {
            files: [
                { path: 'p3.zip' },
                { path: 'p4.zip' },
                { path: 'p5.zip' },
            ]
        };
        frisby.create('should succeed to PUT binaries')
            .put(existingAccountUrl + '/solutions/sbin4/binaries', new_binaries)
            .expectStatus(200)
            .afterJSON(function(json) {
                expect(json.files.length).toEqual(3);
                expect(json.files[0].path).toEqual('p3.zip');
                expect(json.files[0].pathGuid.length).toEqual(36);
                expect(json.files[0].status).toEqual('UNAVAILABLE');
                expect(json.files[1].path).toEqual('p4.zip');
                expect(json.files[2].path).toEqual('p5.zip');
                frisby.create('tidy: should succeed to PUT binaries').delete(existingAccountUrl + '/solutions/sbin4').expectStatus(204).toss();
            })
            .toss();
    })
    .toss();

/*
frisby.create('should fail with 403 to PUT binaries if auth header is invalid')
    .put(existingAccountUrl + '/solutions/s001/binaries')
    .expectStatus(403)
    .afterJSON(assertAccessForbidden())
    .toss();
*/
frisby.create('pre: should succeed to PUT binary')
    .post(existingAccountUrl + '/solutions', { name: 'sbin5', url: '/sbin5', binaries: {
        files: [
            { path: 'p1.zip' },
            { path: 'p2.zip' },
        ]
    }})
    .afterJSON(function(json) {
        var octetStream = 'xxxxxxx';
        frisby.create('should succeed to PUT binary')
            .put(existingAccountUrl + '/solutions/sbin5/binaries/' + json.binaries.files[0].pathGuid, octetStream)
            .expectStatus(200)
            .afterJSON(function(json) {
                frisby.create('after: should succeed to PUT binary')
                    .get(existingAccountUrl + '/solutions/sbin5/binaries')
                    .afterJSON(function(json) {
                        expect(json.files[0].status).toEqual('AVAILABLE');
                        expect(json.files[0].pathGuid).toEqual(null);
                        frisby.create('tidy: should succeed to PUT binary').delete(existingAccountUrl + '/solutions/sbin5').expectStatus(204).toss();
                    })
                    .toss();
            })
            .toss();
    })
    .toss();
