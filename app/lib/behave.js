// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/behave.js - Test the application upon startup
 *
 * @api public
 */

//---------------------------------------------------
// ## VARIABLES

var suites = [],
    specCount = 0,
    failures = 0,
    successes = 0;

var tests = [];

var logger = require('logging')('testing', 'app/lib/behave');

var loggingFunction = log;

//---------------------------------------------------
// ## PUBLIC API

exports.getLoggingFunction = getLoggingFunction;
exports.andSetup = andSetup;
exports.run = run;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * log - add to log output
 *
 * @param {String} text text to output
 * @api private
 */
function log(text) {
    logger.info(text);
}

/**
 * getLoggingFunction - returns logging function
 *
 * @return {Function} logging function
 * @api public
 */
function getLoggingFunction() {
    return loggingFunction;
}

/**
 * Suite - set up the suite
 *
 * @param {String} descText description
 * @api public
 */
function Suite(descText) {
    this.desc = descText;
    this.specs = [];
}

/**
 * evaluate - evaluate for Suite
 *
 * @param {Function} cb callback function
 * @api public
 */
Suite.prototype.evaluate = function(cb) {
    tests.push({
        suite : true,
        name : this.desc
    });

    loggingFunction('Describing ' + this.desc + ':\n');
    var executing = false,
        that = this;

    var timer = setInterval(function() {
        if (that.specs.length > 0 && !executing) {
            executing = true;
            var s = that.specs.shift();
            loggingFunction('Start execution of SPEC: ' + s.desc + '\n');
            s.evaluate(function() {
                loggingFunction('Done with execution of SPEC: ' + s.desc + '\n');
                executing = false;
            });
        } else if (that.specs.length === 0 && !executing) {
            clearInterval(timer);
            cb();
        }
    }, 2000);
};

/**
 * addSpec - add a spec this this' spec list
 *
 * @param {Object} spec spec
 * @api public
 */
Suite.prototype.addSpec = function(spec) {
    this.specs.push(spec);
};

/**
 * Spec - Constructor for Spec
 *
 * @param {String} descText description
 * @param {Boolean} async async flag
 * @param {Number} timeout timeout period
 * @api public
 */
function Spec(descText, async, timeout) {
    this.desc = descText;
    this.async = async;
    this.timeout = timeout;
    this.expectations = [];
}

/**
 * addExpectation - add expectation function to this Spec
 *
 * @param {Function} ex expectation
 * @api public
 */
Spec.prototype.addExpectation = function(ex) {
    this.expectations.push(ex);
};

/**
 * evaluate - add expectation function to this Spec
 *
 * @param {Function} cb callback function
 * @api public
 */
Spec.prototype.evaluate = function(cb) {
    loggingFunction('it ' + this.desc + '\n');
    specCount++;

    if (this.async) {
        var time = 0,
            that = this;

        var timer = setInterval(function() {
            if (that.expectations.length > 0 && that.done) {
                var ex = that.expectations.shift();
                ex.evaluate();
            } else if ((that.expectations.length === 0 && that.done) || (time > that.timeout || 10000)) {
                clearInterval(timer);
                cb();
            }

            time = time + 50;
        }, 50);
    } else {
        for (var i = 0; i < this.expectations.length; i++) {
            var ex = this.expectations[i];
            ex.evaluate();
        }
        cb();
    }
};

/**
 * Expectation - Expectation callback function
 *
 * @param {Object} v value
 * @api public
 */
function Expectation(v) {
    this.someValue = v;
}

/**
 * toBe - Expectation matcher
 *
 * @param {Object} other
 * @api public
 */
Expectation.prototype.toBe = function(other) {
    this.comparisonText = 'to be';
    this.otherValue = other;
    this.satisfied = this.someValue === this.otherValue;
};

/**
 * notToBe - Expectation matcher
 *
 * @param {Object} other
 * @api public
 */
Expectation.prototype.notToBe = function(other) {
    this.comparisonText = 'not to be';
    this.otherValue = other;
    this.satisfied = this.someValue !== this.otherValue;
};

/**
 * toMatch - Expectation matcher
 *
 * @param {Object} regex
 * @api public
 */
Expectation.prototype.toMatch = function(regex) {
    this.comparisonText = 'to match';
    this.otherValue = regex;
    this.satisfied = regex.test(this.someValue);
};

/**
 * notToMatch - Expectation matcher
 *
 * @param {Object} regex
 * @api public
 */
Expectation.prototype.notToMatch = function(regex) {
    this.comparisonText = 'not to match';
    this.otherValue = regex;
    this.satisfied = !regex.test(this.someValue);
};

/**
 * evaluate - Expectation evaluation
 *
 * @param {Object} v value
 * @api public
 */
Expectation.prototype.evaluate = function() {

    var test = {
        name : null,
        success : null
    };

    if (this.satisfied) {
        successes++;
        var str = '[PASS] I expected ' + this.someValue + ' ' + this.comparisonText + ' ' + this.otherValue + '\n';
        str = str.replace(/\"/g, "'");
        loggingFunction(str);

        test.name = str;
        test.success = true;
    } else {
        failures++;
        var strf = '[FAIL] I incorrectly got ' + this.someValue + ', when I expected ' + this.otherValue + '\n';
        strf = strf.replace(/\"/g, "'");
        loggingFunction(strf);

        test.name = strf;
        test.success = false;
    }

    tests.push(test);
};

/**
 * andSetup - Configure the global object of a test suite with the necessary functions
 *
 * @param {Object} global
 * @api public
 */
function andSetup(global) {
    //Create the BDD interface on the global object
    global.describe = function(suiteDesc, suiteClosure) {
        loggingFunction('Creating new SUITE: ' + suiteDesc + '\n');

        //create a new suite object for the scope of the current "describe"
        loggingFunction('Creating new SUITE: ' + suiteDesc + '\n');
        var SUITE = new Suite(suiteDesc);
        suites.push(SUITE);

        //Now, create a new global "it" which has SUITE in scope
        global.it = function(specDesc, specClosure) {
            var SPEC = new Spec(specDesc);
            SUITE.addSpec(SPEC);

            //Now, create a new global "expect" which has SPEC in scope
            global.expect = function(someValue) {
                var ex = new Expectation(someValue);
                SPEC.addExpectation(ex);
                return ex;
            };

            //now run spec
            specClosure();
            loggingFunction('Done with execution of SPEC: ' + specDesc + '\n');
            SPEC.done = true;
        };

        //Async specs
        global.it.eventually = function(specDesc, specClosure, timeout) {
            var SPEC = new Spec(specDesc, true, timeout);
            SUITE.addSpec(SPEC);

            //Now, create a new global "expect" which has SPEC in scope
            global.expect = function(someValue) {
                var ex = new Expectation(someValue);
                SPEC.addExpectation(ex);
                return ex;
            };

            //now run spec
            specClosure(function() {
                SPEC.done = true;
            });
        };

        //now run suite
        loggingFunction('Running SUITE: ' + suiteDesc + '\n');
        suiteClosure();
    };
}

/**
 * writeJUnitXMLFile -  create XML string in JUnit format
 *
 * @param {List} tests list of tests to loop through
 * @api private
 */
function writeJUnitXMLFile(tests, junit_file_location) {
    if (!junit_file_location) {
        return;
    }

    loggingFunction('Writing JUnit XML file...' + '\n');

    // Build XML string
    var xmlString = '<?xml version="1.0" ?>';
    xmlString += '<testsuites>\n';
    xmlString += '<testsuite name="Main">\n';

    _.each(tests, function(test, index) {

        if (test.suite && test.suite === true) {
            if (index === 0) {
                xmlString = '<?xml version="1.0"?>\n';
                xmlString += '<testsuites>\n';
                xmlString += '<testsuite name="' + test.name + '">\n';
            } else {
                xmlString += '</testsuite>';
                xmlString += '<testsuite name="' + test.name + '">\n';
            }
        } else {

            xmlString += '<testcase name="' + test.name + '">\n';
            if (test.success === false) {
                xmlString += '<failure type="NotEnoughFoo"> ' + test.name + ' </failure>\n';
            }
            xmlString += '</testcase>\n';

        }

    });

    xmlString += '</testsuite>\n';
    xmlString += '</testsuites>';

    // Write XML to file
    var fileloc = junit_file_location;
    if (!fileloc || fileloc.length == 0) {
        fileloc = '/tmp/junit-buildresults.xml';
    }
    var newFile = Titanium.Filesystem.getFile(fileloc);

    newFile.createFile();

    if (newFile.exists()) {
        newFile.write(xmlString);
        Ti.API.info('[JUNITXMLFILE] written to ' + fileloc);
    }
}

/**
 * run - Report on the suites that have been added
 *
 * @api public
 */
function run(junit_file_location, logFunc) {
    specCount = 0;
    failures = 0;
    successes = 0;

    if (logFunc) {
        loggingFunction = logFunc;
    }
    loggingFunction('');
    loggingFunction('Oh, behave! Testing in progress...\n');

    var executing = false;
    var timer = setInterval(function() {
        if (suites.length > 0 && !executing) {
            executing = true;
            var s = suites.shift();
            loggingFunction('Start execution of SUITE: ' + s.desc + '\n');
            s.evaluate(function() {
                loggingFunction('Done with execution of SUITE: ' + s.desc + '\n');
                executing = false;
            });
        } else if (suites.length === 0 && !executing) {
            loggingFunction('');
            loggingFunction('*******************************************\n');
            loggingFunction('* \\o/ T E S T  R U N  C O M P L E T E \\o/ *\n');
            loggingFunction('*******************************************\n');
            loggingFunction('You ran ' + specCount + ' specs with ' + failures + ' failures and ' + successes + ' successes.\n');

            // Write jUnit XML file
            writeJUnitXMLFile(tests, junit_file_location);
            loggingFunction('...OK\n\n');

            clearInterval(timer);

            loggingFunction = log;
            Alloy.eventDispatcher.trigger('tests:complete');
        }
    }, 5000);
}
