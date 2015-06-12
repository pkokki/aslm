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

frisby.create('should GET all solutions')
    .get(existingAccountUrl + '/solutions')
    .expectStatus(200)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .afterJSON(function(solutions) {
        expect(solutions.length >= 2).toEqual(true);
    })
    .toss();
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

        frisby.create('tidyup').delete(existingAccountUrl + '/solutions/new001').expectStatus(204).toss();
    })
    .toss();
frisby.create('should succeed to POST a solution with binaries')
    .post(existingAccountUrl + '/solutions', {
        name: 'newWithBinaries',
        url: '/newWithBinaries',
        binaries: {
            totalSize: 1234,
            files: [ { properties: { path: 'p1.txt' } }, { properties: { path: 'p2.txt' } } ]
        }
    })
    .expectStatus(201)
    .afterJSON(function(json) {
        expect(json.binaries.totalSize).toEqual(1234);
        expect(json.binaries.files.length).toEqual(2);
        expect(json.binaries.files[0].properties.path).toEqual('p1.txt');
        expect(json.binaries.files[0].properties.pathGuid.length).toEqual(36);
        expect(toString.call(new Date(json.binaries.files[0].properties.createdAt))).toEqual('[object Date]');
        expect(toString.call(new Date(json.binaries.files[0].properties.updatedAt))).toEqual('[object Date]');
        expect(json.binaries.files[0].properties.size).toEqual(0);
        expect(json.binaries.files[0].properties.status).toEqual('UNAVAILABLE');
        expect(json.binaries.files[0].properties.hash).toBeNull();
        expect(json.binaries.files[1].properties.path).toEqual('p2.txt');

        frisby.create('tidy up')
            .delete(existingAccountUrl + '/solutions/newWithBinaries')
            .expectStatus(204)
            .toss();
    })
    .toss();
frisby.create('pre')
    .post(existingAccountUrl + '/solutions', { name: 's002', url: '/s002' })
    .afterJSON(function() {
        frisby.create('should fail with 409 to POST a solution if the solution is already exists')
            .post(existingAccountUrl + '/solutions', {
                name: 's002',
                url: '/xxxxx'
            })
            .expectStatus(409)
            .afterJSON(function() {
                assertError(1102);
                frisby.create('tidyup').delete(existingAccountUrl + '/solutions/new001').expectStatus(204).toss();
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
        name: 'validSolutionName',
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
frisby.create('pre').post(existingAccountUrl + '/solutions', { name: 's002', url: '/s002' }).afterJSON(function() {
    frisby.create('pre').put(existingAccountUrl + '/solutions/s002/state', { state: 'STARTED' }).afterJSON(function() {
        frisby.create('should fail with 409 to PUT a solution, if application is running')
            .put(existingAccountUrl + '/solutions/s002', { name: 'updated' })
            .expectStatus(409)
            .afterJSON(function() {
                assertError(1105);
                frisby.create('tidyup').delete(existingAccountUrl + '/solutions/s002').toss();
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
frisby.create('should fail with 409 to DELETE an existing solution, if application is running')
    .delete(existingAccountUrl + '/solutions/s002')
    .expectStatus(409)
    .afterJSON(assertError(1105))
    .toss();
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
    .get(existingAccountUrl + '/solutions/s002/state')
    .expectStatus(200)
    .afterJSON(function(json) {
        expect(json.state).toEqual('STARTED');
        expect(json.urls).toBeUndefined();
        expect(json.processes).toBeUndefined();
    })
    .toss();
frisby.create('should succeed to GET the state with details of a solution')
    .get(existingAccountUrl + '/solutions/s002/state?verbose=true')
    .expectStatus(200)
    .afterJSON(function(json) {
        expect(json.state).toEqual('STARTED');
        expect(json.urls).toBeDefined();
        expect(json.processes).toBeDefined();
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
            })
            .toss();
    })
    .toss();
frisby.create('should fail to start a STARTED solution')
    .put(existingAccountUrl + '/solutions/running2/state', { state: 'STARTED' })
    .expectStatus(409)
    .afterJSON(assertError(1107))
    .toss();
frisby.create('should fail to stop a STOPPED solution')
    .put(existingAccountUrl + '/solutions/stopped2/state', { state: 'STOPPED' })
    .expectStatus(409)
    .afterJSON(assertError(1107))
    .toss();
/*
frisby.create('should fail with 403 to PUT the state if auth header is invalid')
    .put(existingAccountUrl + '/solutions/s001/state', { state: 'STARTED' })
    .expectStatus(403)
    .afterJSON(assertAccessForbidden())
    .toss();
*/
frisby.create('should get the binaries of solution')
    .get(existingAccountUrl + '/solutions/sbin/binaries')
    .expectStatus(200)
    .afterJSON(function(json) {
        expect(json.totalSize).toBeDefined();
        expect(json.status).toEqual('DEPLOYED');
        expect(json.files).toBeDefined();
        expect(json.files[0].properties.path).toBeDefined();
        expect(json.files[0].properties.pathGuid).toBeDefined();
        expect(json.files[0].properties.size).toBeDefined();
        expect(json.files[0].properties.status).toEqual('AVAILABLE');
        expect(json.files[0].properties.hash).toBeDefined();
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
