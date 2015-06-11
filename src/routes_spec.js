var frisby = require('frisby');
var url = 'http://localhost:3000/api';

frisby.create('GET all solutions')
    .get(url + '/accounts/123/solutions')
    .expectStatus(200)
    //.expectHeader('Content-Type', 'application/json')
    //.expectJSON({ 'url': 'http://httpbin.org/get' })
    .toss();
