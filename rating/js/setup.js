var oldCallback;
var score = 0;
var num_trials = 10;

function sendData() {
    console.log('sending data to mturk');
    jsPsych.turk.submitToTurk({'score':score});
}

var consentHTML = {
    'str1' : '<p>In this HIT, you will see some descriptions of objects. For each description, you will try to guess which of the objects is the best match. For each correct match, you will receive a bonus. </p>',
    'str2' : '<p>We expect the average game to last approximately 5-10 minutes, including the time it takes to read instructions.</p>',
    'str3' : "<p>If you encounter a problem or error, send us an email (sketchloop@gmail.com) and we will make sure you're compensated for your time! Please pay attention and do your best! Thank you!</p><p> Note: We recommend using Chrome. We have not tested this HIT in other browsers.</p>",
    'str4' : ["<u><p id='legal'>Consenting to Participate:</p></u>",
        "<p id='legal'>By completing this HIT, you are participating in a study being performed by cognitive scientists in the Stanford Department of Psychology. If you have questions about this research, please contact the <b>Sketchloop Admin</b> at <b><a href='mailto://sketchloop@gmail.com'>sketchloop@gmail.com</a> </b> or Noah Goodman (n goodma at stanford dot edu) You must be at least 18 years old to participate. Your participation in this research is voluntary. You may decline to answer any or all of the following questions. You may decline further participation, at any time, without adverse consequences. Your anonymity is assured; the researchers who have requested your participation will not receive any personal information about you.</p>"].join(' ')
};

var instructionsHTML = {
    'str1' : "<p> Here's how the game will work: On each trial, you will see a drawing in black and a reference shape in grey. Your goal is to rate whether the drawing aligns with the reference shape on a scale from 1(not overlapped at all) to 5(completely overlapped).",
    'str2' : '<p> It is very important that you consider the scale carefully and try your best!',
    'str3' : "<p> Once you are finished, the HIT will be automatically submitted for approval. If you enjoyed this HIT, please know that you are welcome to perform it multiple times. Let's begin! </p>"
};

var welcomeTrial = {
    type: 'instructions',
    pages: [
        consentHTML.str1,
        consentHTML.str2,
        consentHTML.str3,
        consentHTML.str4,
        instructionsHTML.str1,
        instructionsHTML.str2,
        instructionsHTML.str3
    ],
    show_clickable_nav: true
};

var acceptHTML = {
  'str1' : '<p> Welcome! In this HIT, you will see some sketches of objects. For each sketch, you will try to guess which of the objects is the best match. </p>',
  'str2' : '<p> This is only a demo! If you are interested in participating, please accept the HIT in MTurk before continuing further. </p>'
}

var previewTrial = {
  type: 'instructions',
  pages: [acceptHTML.str1, acceptHTML.str2],
  show_clickable_nav: true,
  allow_keys: false
}

var goodbyeTrial = {
    type: 'instructions',
    pages: [
        '<p>Thanks for participating in our experiment! You are all done. Please click the button to submit this HIT.</p>'
    ],
    show_clickable_nav: true,
    on_finish: function() { sendData();}
};

// define trial object with boilerplate
function Trial () {
    this.type = 'image-button-response';
    this.iterationName = 'pilot0';
    this.dev_mode = false;
    this.prompt = "Compared to the reference image, what's the score do you think this tracing would get?";
    this.image_url = "/demo.png";
    this.category ='square';
    this.choices = ['1','2','3','4','5'];
    this.dev_mode = false
}

function setupGame () {

    // number of trials to fetch from database is defined in ./app.js
    var socket = io.connect();


    socket.on('onConnected', function(d) {
        // get workerId, etc. from URL (so that it can be sent to the server)
        var turkInfo = jsPsych.turk.turkInfo();

        // pull out info from server
        var meta = d.meta;
        var id = d.id;

	// at end of each trial save score locally and send data to server
	var main_on_finish = function(data) {
            if (data.score) {
		score = data.score;
            }
            socket.emit('currentData', data);
	};

	var main_on_start = function(trial) {
            console.log("main on start");
            oldCallback = newCallback;
            var newCallback = function(d) {
		console.log('data retrieved from db: ',d);
		trial.category = d.category;
		trial.image_url = d.image_url;
		trial.age = d.age;
		trial.session_id = d.session_id;

            };
            socket.removeListener('stimulus', oldCallback);
            socket.on('stimulus', newCallback);
            // call server for stims
            socket.emit('getStim', {gameID: id});
	};
	
        // Bind trial data with boilerplate
        var trials = _.map(_.rangeRight(num_trials), function(trialData, i) {
            return _.extend(new Trial, trialData, {
                gameID: id,
                trialNum : i,
                choices: ['1','2','3','4','5'],
                post_trial_gap: 1000, // add brief ITI between trials
                on_start: main_on_start,
                on_finish : main_on_finish

            });
        });


        // Stick welcome trial at beginning & goodbye trial at end
        if (!turkInfo.previewMode) {
            trials.unshift(welcomeTrial);
        } else {
            trials.unshift(previewTrial); // if still in preview mode, tell them to accept first.
        }
        trials.push(goodbyeTrial);

        console.log(trials.length);

        jsPsych.init({
            timeline: trials,
            default_iti: 1000,
            show_progress_bar: true
        });
    });


}
