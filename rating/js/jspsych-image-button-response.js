/**
 * jspsych-image-button-response
 * Josh de Leeuw
 *
 * plugin for displaying a stimulus and getting a keyboard response
 *
 * documentation: docs.jspsych.org
 *
 **/

jsPsych.plugins["image-button-response"] = (function() {

    var plugin = {};

    jsPsych.pluginAPI.registerPreload('image-button-response', 'stimulus', 'image');

    plugin.info = {
        name: 'image-button-response',
        description: '',
        parameters: {
            category: {
                type: jsPsych.plugins.parameterType.STRING, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
                pretty_name: 'category',
                default: undefined,
                description: 'The category label.'
            },
            image_html: {
                type: jsPsych.plugins.parameterType.IMAGE,
                pretty_name: 'image HTML',
                default: '<img src="/demo.png" height="448" width="448" id="image_html">',
                array: true,
                description: 'The html of the image cue used to prompt drawing. Can create own style.'
            },
            image_url: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'image urls',
                default: undefined,
                array: true,
                description: 'The URL for the image cues.'
            },
            session_id: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'session id',
                default: undefined,
                array: true,
                description: 'The unique identifer for each image'
            },
            choices: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Choices',
                default: undefined,
                array: true,
                description: 'The labels for the buttons.'
            },
            button_html: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Button HTML',
                default: '<button class="jspsych-btn">%choice%</button>',
                array: true,
                description: 'The html of the button. Can create own style.'
            },
            prompt: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Prompt',
                default: null,
                description: 'Any content here will be displayed under the button.'
            },
            stimulus_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Stimulus duration',
                default: null,
                description: 'How long to hide the stimulus.'
            },
            trial_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Trial duration',
                default: null,
                description: 'How long to show the trial.'
            },
            trial_num: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Trial number',
                default: null,
                description: 'The number id of the current trial for each player'
            },
            margin_vertical: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Margin vertical',
                default: '0px',
                description: 'The vertical margin of the button.'
            },
            margin_horizontal: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Margin horizontal',
                default: '8px',
                description: 'The horizontal margin of the button.'
            },
            response_ends_trial: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Response ends trial',
                default: true,
                description: 'If true, then trial will end when user responds.'
            },
        }
    }

    plugin.trial = function(display_element, trial) {

        // if(typeof trial.image_url === 'undefined'){
        //     console.error('Required parameter "stimulus" missing in image-button-response');
        // }

        // wrapper function to show everything, call this when you've waited what you
        // reckon is long enough for the data to come back from the db
        function show_display() {

            var html = "";

            // display the prompt
            if (trial.prompt !== null) {
                var html = '<div id="prompt">' + trial.prompt + '</div>';
            }

            // place the target drawing inside the image container (which has fixed location)
            html += '<div id="img_container" style="display:none">';

            var img_html_replaced = trial.image_html.replace('imageURL', trial.image_url);
            html += img_html_replaced;

            html += '</div>';

            //display buttons
            var buttons = [];
            if (Array.isArray(trial.button_html)) {
                if (trial.button_html.length == trial.choices.length) {
                    buttons = trial.button_html;
                } else {
                    console.error('Error in image-button-response plugin. The length of the button_html array does not equal the length of the choices array');
                }
            } else {
                for (var i = 0; i < trial.choices.length; i++) {
                    buttons.push(trial.button_html);
                }
            }
            html += '<div id="jspsych-image-button-response-btngroup">';

            for (var i = 0; i < trial.choices.length; i++) {
                var str = buttons[i].replace(/%choice%/g, trial.choices[i]);
                html += '<div class="jspsych-image-button-response-button" style="display: inline-block; margin:' + trial.margin_vertical + ' ' + trial.margin_horizontal + '" id="jspsych-image-button-response-button-' + i + '" data-choice="' + i + '">' + str + '</div>';
            }
            html += '</div>';

            display_element.innerHTML = html;

            // start timing
            var start_time = performance.now();

            for (var i = 0; i < trial.choices.length; i++) {
                display_element.querySelector('#jspsych-image-button-response-button' + i).addEventListener('click', function (e) {
                    var choice = e.currentTarget.getAttribute('data-choice'); // don't use dataset for jsdom compatibility
                    after_response(choice);
                });
            }
        }

        // wait for a little bit for data to come back from db, then show_display
        setTimeout(function() {show_display(); }, 1500);

        // store response
        var response = {
            rt: null,
            button: null
        };

        // function to handle responses by the subject
        function after_response(choice) {

            // measure rt
            var end_time = performance.now();
            var rt = end_time - start_time;
            response.button = choice;
            response.rt = rt;

            // after a valid response, the stimulus will have the CSS class 'responded'
            // which can be used to provide visual feedback that a response was recorded
            display_element.querySelector('#jspsych-image-button-response-stimulus').className += ' responded';

            // disable all the buttons after a response
            var btns = document.querySelectorAll('.jspsych-image-button-response-button button');
            for(var i=0; i<btns.length; i++){
                //btns[i].removeEventListener('click');
                btns[i].setAttribute('disabled', 'disabled');
            }

            if (trial.response_ends_trial) {
                end_trial();
            }
        };

        // function to end trial when it is time
        function end_trial() {
            // disable button to prevent double firing
            submit_button.disabled=true;


            // data saving
            var trial_data = {
                dbname:'kiddraw',
                colname: 'tracing_eval',
                iterationName: 'testing',
                eventType: 'click',
                reaction_time: response.rt,
                image_url: trial.image_url,
                session_id: trial.session_id,
                button_pressed: response.button,
                category: trial.category,
                trialNum: trial.trialNum,
                pngData: dataURL,
                startTrialTime: startTrialTime,
                endTrialTime: Date.now()
            };

            // clear the HTML in the display element
            display_element.innerHTML = '';


            // end trial
            jsPsych.finishTrial(trial_data);



        };



        // hide image if timing is set
        if (trial.stimulus_duration !== null) {
            jsPsych.pluginAPI.setTimeout(function() {
                display_element.querySelector('#jspsych-image-button-response-stimulus').style.visibility = 'hidden';
            }, trial.stimulus_duration);
        }

        // end trial if time limit is set
        if (trial.trial_duration !== null) {
            jsPsych.pluginAPI.setTimeout(function() {
                end_trial();
            }, trial.trial_duration);
        }

    };

    return plugin;
})();