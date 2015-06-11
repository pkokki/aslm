
/**
 * Module dependencies.
 */

var express = require('express');
var mongoose = require('mongoose');                     // mongoose for mongodb
var morgan = require('morgan');
var bodyParser = require('body-parser');    			// pull information from HTML POST (express4)
var methodOverride = require('method-override'); 		// simulate DELETE and PUT (express4)
var config = require('./config');
//var routes = require('./routes');

var app = module.exports = express();

// ********************** Configuration **********************
// connect to mongoDB database
mongoose.connect(config.db.url);

app.use(express.static(__dirname + '/public'));			// set the static files location
app.use(morgan('dev'));									// log every request to the console
app.use(bodyParser.urlencoded({'extended':'true'}));	// parse application/x-www-form-urlencoded
app.use(bodyParser.json());								// parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());

//app.set('views', __dirname + '/server/views');
//app.set('view engine', 'jade');

//if (app.settings.env == 'development') {
//	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
//}
//else if (app.settings.env == 'production') {
//	app.use(express.errorHandler());
//}

require('./routes')(app);

// ********************** TEMP MODELS **********************
/*var Tenant = mongoose.model('Tenant', {
	username : String,
	email : String,
	fullname : String,
	company : String,
});
*/
// ********************** TEMP API ROUTES **********************
/*app.get('/api/tenants', function(req, res) {
	Tenant.find(function(err, tenants) {
		if (err)
			res.send(err)
		res.json(tenants);
	});
});
app.post('/api/tenants', function(req, res) {
	var pwd = req.body.password;
	var payload = {
		username : req.body.username,
		email : req.body.email,
		fullname : req.body.fullname,
		company : req.body.company,
		active : false
	};
	var next = function(err, tenant) {
		if (err)
			res.send(err);
		res.json(tenant);
	};
	Tenant.create(payload, next);
});
app.delete('/api/tenants/:tenant_id', function(req, res) {
	var params = {
		 _id : req.params.tenant_id
	};
	var next = function(err, tenant) {
		if (err)
			res.send(err);
		res.json(tenant);
	};
	Tenant.remove(params, next);
});
*/
// ********************** APP ROUTES **********************
//app.get('/', routes.index);

// ********************** Listen **********************
app.listen(3000);
console.log("Express server listening on port %d in %s mode", 3000, app.settings.env);
