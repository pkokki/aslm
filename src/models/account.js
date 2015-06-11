var mongoose = require('mongoose');

// define our account model
// module.exports allows us to pass this to other files when it is called
module.exports = mongoose.model('Account', {
    name : {type : String, default: ''}
});
