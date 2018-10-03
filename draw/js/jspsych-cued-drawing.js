/**
 * jspsych-cued-drawing
 * Judy Fan
 *
 * plugin for displaying a cue and getting drawing response
 *
 **/ 

jsPsych.plugins["jspsych-cued-drawing"] = (function() {

  var plugin = {};

  plugin.info = {
    name: "jspsych-cued-drawing",
    parameters: {
      cue_label: {
        type: jsPsych.plugins.parameterType.STRING, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
        pretty_name: 'cue_label',
        default: undefined,
        description: 'The label used to cue drawing.'
      }, 
      cue_html: {
        type: jsPsych.plugins.parameterType.IMAGE,
        pretty_name: 'cue image HTML',
        default: '<img src="%imageURL%" height="448" width="448" id="cue_html">',
        array: true,
        description: 'The html of the image cue used to prompt drawing. Can create own style.'
      },      
      cue_image_url: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'cue_image_urls',
        default: undefined,
        array: true,
        description: 'The URL for the image cues.'
      },
      cue_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'cue_duration',
        default: null,
        description: 'How long to show the cue (in milliseconds).'
      }, 
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'prompt',
        default: null,
        description: 'What to display to the participant as the instructions.'
      }                       
    }
  }

  plugin.trial = function(display_element, trial) {

    // print errors if the parameters are not correctly formatted 
    if(typeof trial.cue_label === 'undefined'){
      console.error('Required parameter "cue_label" missing in jspsych-cued-drawing');
    }

    // create new sketchpad
    sketchpad = new Sketchpad();

    // wrapper function to show cue, this is called when you've waited as long as you
    // reckon is long enough for the data to come back from the db
    function show_cue() {       

      // display prompt if there is one
      if (trial.prompt !== null) {
        var html = '<div id="prompt">' + trial.prompt + '</div>';
      }         

      // display label
      html += '<div><p id="cue_label"> "'+ trial.cue_label +'"</p></div>';

      // display image if the condition is 'photo'
      if (trial.condition == 'photo') {
        // place cue image inside the cue image container (which has fixed location)
        html += '<div id="cue-container">';
          // embed images inside the response button divs
          var str = trial.cue_html.replace(/%imageURL%/g, trial.cue_URL);
          html += trial.cue_html;        
        html += '</div>'; 
      }

      // actually assign html to display_element.innerHTML
      display_element.innerHTML = html;

      // reset global current stroke number variable
      currStrokeNum = 0;

      // wait for the cue duration, then trigger display of the drawing canvas


    }

    // wait for a little bit for data to come back from db, then show_display
    setTimeout(function() {show_cue(); }, 1500);    

    function show_canvas() {  
      // fade out the cue

      // fade in the canvas       
    }

    function update_canvas() {
      // update canvas to render each stroke

      // send individual stroke data to db
    }

    // actually send stroke data back to server to save to db
    function send_stroke_data(path) {
      path.selected = false;
      var svgString = path.exportSVG({asString: true});
      // specify other metadata

      stroke_data = {
          dbname:'drawbase',
          colname: 'photodraw2', 
          iterationName: 'development',
          eventType: 'stroke',
          svg: svgString,
          category: trial.cue_label,
          trialNum: trial.trialNum,
          // startTrialTime: startTrialTime,
          // startStrokeTime: startStrokeTime,
          // endStrokeTime: endStrokeTime,
          time: Date.now()
      };

      // send stroke data to server
      console.log(stroke_data);
      socket.emit('stroke',stroke_data);

    }

    function end_trial() {
      // triggered either when submit button is clicked or time runs out      

      // sketch rendering to base64 encoding

      // data saving
      var trial_data = {
        cue_label: 'PLACEHOLDER',
        cue_URL: 'CUE_URL'      

      };

      // clear the display
      display_element.innerHTML = '';

      // end trial
      jsPsych.finishTrial(trial_data);

    }


  };

  return plugin;
})();


///////// DRAWING PARAMS ///////////

// globals
var drawingAllowed = true;
var strokeColor = 'black';
var strokeWidth = 5;
var simplifyParam = 10;
var currStrokeNum = 0;

///////// CORE DRAWING FUNCTIONS ///////////

function Sketchpad() {
  // initialize paper.js
  paper.setup('sketchpad');
  view.viewSize = new Size(448,448);
}

// bind events to the sketchpad canvas
Sketchpad.prototype.setupTool = function() {
  path = [];
  var tool = new Tool();

  tool.onMouseMove = function(event) {
    if(drawingAllowed) {
      var point = event.point.round();
      currMouseX = point.x;
      currMouseY = point.y;
      if(event.modifiers.shift & !_.isEmpty(path)) {
        path.add(point);
      }
    }
  };

  tool.onMouseDown = function(event) {
    startStroke(event);
  };

  tool.onMouseDrag = function(event) {
    if (drawingAllowed && !_.isEmpty(path)) {
      var point = event.point.round();
      currMouseX = point.x;
      currMouseY = point.y;
      path.add(point);
    }
  };

  tool.onMouseUp = function(event) {
    endStroke(event);
  };

};

function startStroke(event) {
    if (drawingAllowed) {
      startStrokeTime = Date.now();
      // If a path is ongoing, send it along before starting this new one
      if(!_.isEmpty(path)) {
        endStroke(event);
      }

      var point = (event ? event.point.round() :
       {x: currMouseX, y: currMouseY});
        path = new Path({
          segments: [point],
          strokeColor: strokeColor,
          strokeWidth: strokeWidth
        });
    }
  };

function endStroke(event) {
  // Only send stroke if actual line (single points don't get rendered)
  if (drawingAllowed && path.length > 1) {
    endStrokeTime = Date.now();
    // Increment stroke num
    currStrokeNum += 1;

    // Simplify path to reduce data sent
    path.simplify(simplifyParam);

  // reset path
  path = [];
}