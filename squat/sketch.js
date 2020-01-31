let CERTAINTY_THRESHOLD = 0.0; // threshold for plotting the keypoints
let MIRROR_VIDEO_FEED = true;
let SHOW_NUMBERS = true;
let SHOW_SKELETON = true;
let DEBUG_MODE = false;
let UPDATE_THRESHOLD = 0.4; // certainty threshold for updating the keypoints
let ACTIVATION_FUNCTION = identityFunction;

let video;
let poseNet;
let textField; // text to the right of the video (available in DEBUG_MODE)
let overallCertainty = 0.0;
let keypoints = [];
let infoCount = 1;
let getInPositionTimer = 10;
let shoulderLine = -1;
let upperHelpLine = -1;
let lowerHelpLine = -1;
let hipLine = -1;
let squatCount = 0;
let shouldersBelowLowerLine = false;

function setup() {
  createCanvas(640, 480);
  createP(""); // blank line under canvas
  
  // instantiate the keypoints array
  for (let i=0;i<17;i++) {
    keypoints.push(new Keypoint(i));
  }
  
  video = createCapture(VIDEO);
  poseNet = ml5.poseNet(video, modelReady);
  poseNet.on('pose', gotPoses);
  
  if (DEBUG_MODE == true) {
    textField = createDiv('CONFIDENCE SCORES: <br><br> Waiting...');
    textField.position(650,0);
    textField.size(320,480);
  } else {
    video.hide();
    SHOW_NUMBERS = false;
    SHOW_SKELETON = false;
  }
  
  // every second update the getInPositionTimer
  function updateTimer() {
    if (getInPositionTimer != 0) {
      getInPositionTimer--;
      console.log(getInPositionTimer);
      if (getInPositionTimer == 0) {
        console.log("LET'S START WORKING OUT!")
      }
    }
  }
  setInterval(updateTimer,1000);
}

function gotPoses(poses) {
  
  if (infoCount != 0) {
    // only for debugging
    console.log(poses[0]);
    console.log(keypoints);
    infoCount--;
  }
  
  if (poses.length > 0) {
    // update the keypoints with the new pose data
    let pose = poses[0].pose;
    overallCertainty = pose.score;
    for (let i=0; i< pose.keypoints.length; i++) {
      keypoints[i].update(pose.keypoints[i].position.x,pose.keypoints[i].position.y,pose.keypoints[i].score,pose.keypoints[i].part);
    }
    
    // if in debug mode, write the confidence scores to the textField
    if (DEBUG_MODE == true) {
      writeScores();
    }
  }
}

function writeScores() {
  let LINE_LENGTH = 30;
  let content = 'CONFIDENCE SCORES: <br><br>' +  '<TABLE BORDER><TR><TH>overallCertainty</TH><TD>' + prettyProbability(overallCertainty) + '</TD></TR> <br>';
  for (let i=0; i< keypoints.length; i++) {
      content += '<TR><TH>' + i + ': ' + keypoints[i].name  + '</TH><TD>' + prettyProbability(keypoints[i].certainty) + '</TD></TR>';
  }
  content += '</TABLE>'
  textField.html(content);
}

function prettyProbability(floatNum) {
  return (round(floatNum * 10000) / 100) + " %";
}

function modelReady() {
  console.log('Let\'s get ready to estimate your pose!!!');
}

function draw() {
  if (MIRROR_VIDEO_FEED == true) {
    // flip the video vertically to create a video which functions as a mirror
    translate(width,0); // move canvas to the right
    scale(-1.0,1.0); // flip x-axis backwards
  }
  
  /*
  if (DEBUG_MODE == true) {
    image(video, 0, 0);
  } else {
    background(150);
  }
  */
  image(video, 0, 0);
  
  if (getInPositionTimer > 0) {
    // show countdown of getInPositionTimer
    push()
    if (MIRROR_VIDEO_FEED == true) {
      translate(width,0);
      scale(-1.0,1.0);
    }
    fill(255,255,255); // setting color to white
    textSize(64);
    text(getInPositionTimer,width/2,height/2); // show the timer
    pop();
  }
  
  if (getInPositionTimer == 0) {
    // show squat count
    push();
    if (MIRROR_VIDEO_FEED == true) {
      translate(width,0);
      scale(-1.0,1.0);
    }
    fill(255,0,0); // setting color to red
    textSize(64);
    text(squatCount,width/16,height/8); // show the squatCount
    pop();
    
    // d is dictance between the nose and the left eye
    let d = dist(keypoints[0].x, keypoints[0].y, keypoints[1].x, keypoints[1].y);
    
    drawShouldersAndHips();
  
    for (let i=0; i < keypoints.length;i++) {
      fill(0,255,0); // setting color to green
      keypoints[i].display(d/2); // display the i.th keypoint
    }
  
    if (SHOW_SKELETON == true) {
      drawSkeleton();
    }
    drawAnimation(d);
    updateSquatCount();
    }
}

function updateSquatCount() {
  // try to detect the shoulder
  let leftShoulder = keypoints[5];
  let rightShoulder = keypoints[6];
  
  if (shouldersBelowLowerLine == true) {
    if (leftShoulder.y <= upperHelpLine && rightShoulder.y <= upperHelpLine) {
      shouldersBelowLowerLine = false;
      squatCount++;
    }
  } else {
    if (leftShoulder.y >= lowerHelpLine && rightShoulder.y >= lowerHelpLine) {
      shouldersBelowLowerLine = true;
    } 
  }
  
}

function drawShouldersAndHips() {
  let shoulderDetected = (shoulderLine > 0) ? true : false;
  let hipDetected = (hipLine > 0) ? true : false;
  
  if (shoulderDetected == false && hipDetected == false) {
    // try to detect the shoulder
    let leftShoulder = keypoints[5];
    let rightShoulder = keypoints[6];
    
    // try to detect the hip
    let leftHip = keypoints[11];
    let rightHip = keypoints[12];
    
    if (leftShoulder.certainty > 0.7 && rightShoulder.certainty > 0.7 && leftHip.certainty > 0.7 && rightHip.certainty > 0.7) {
      
      // shoulders have been successfully detected
      shoulderLine = (leftShoulder.y + rightShoulder.y) * 0.5;
      shoulderDetected = true;
      
      // hips have been successfully detected
      hipLine = (leftHip.y + rightHip.y) * 0.5;
      hipDetected = true;
      
      // calculate help lines
      distanceShoulderHip = hipLine - shoulderLine; // is a positive number!
      upperHelpLine = shoulderLine + distanceShoulderHip/3;
      lowerHelpLine = upperHelpLine + distanceShoulderHip/3;
    }
  }
  
  // draw hips and shoulder lines if possible
  
  if (shoulderDetected == true && hipDetected == true) {
    push();
    stroke('red');
    
    line(0,shoulderLine,width,shoulderLine); // draws shoulders
    
    line(0,hipLine,width,hipLine); // draws hips
    
    // draws area inbetween
    noStroke();
    fill(255,0,0,100); // color: red, slightly transparent
    
    rect(0,upperHelpLine,width,lowerHelpLine-upperHelpLine);
    pop();
  }
  
}
  

function drawAnimation(distNoseEye) {
  drawHead();
  drawBelly();
  
   let joints = [
    [5,7], // left biceps
    [7,9], // left forearm
    [6,8], // right biceps
    [8,10], // right forearm
    [11,13], // left quad
    [13,15], // left calf
    [12,14], // right quad
    [14,16] // right calf
  ];
  
  let jointWidth = distNoseEye;
  
  for (let i=0;i<joints.length;i++) {
    drawJoint(joints[i][0],joints[i][1],jointWidth);
  }
}

function drawHead() {
  let leftEar = keypoints[3];
  let rightEar = keypoints[4];
  
  // calculate midpoint of the ears
  let midX = (leftEar.x + rightEar.x) * 0.5;
  let midY = (leftEar.y + rightEar.y) * 0.5;
  
  // calculate the distance between the ears
  let earDist = sqrt(pow(leftEar.x-rightEar.x,2)+pow(leftEar.y-rightEar.y,2));
  
  push();
  fill(0,153,153,100);
  
  // rotate head
  let angle = angleTwoPoints(leftEar,rightEar);
  translate(midX,midY);
  rotate(angle);
  
  ellipse(0,0,earDist,earDist*1.2);
  pop();
}

function drawBelly() {
  let leftShoulder = keypoints[5];
  let rightShoulder = keypoints[6];
  let leftHip = keypoints[11];
  let rightHip = keypoints[12];
  
  // draw rectangle
  
  // calculate starting point
  let upperLeftX = (leftShoulder.x + leftHip.x) * 0.5;
  let upperLeftY = (leftShoulder.y + rightShoulder.y) * 0.5;
  
  let bellyWidth = ((rightShoulder.x+rightHip.x)-(leftShoulder.x+leftHip.x)) * 0.5;
  let bellyHeight = abs((leftShoulder.y+rightShoulder.y)-(leftHip.y+rightHip.y)) * 0.5;
  
  if (bellyWidth < 0) {
    // if bellyWidth is negative, then upperLeftX is in fact the x-coordinate of the upperRight corner
    upperLeftX += bellyWidth;
    bellyWidth = abs(bellyWidth);
  }
  
  let cornerRadius = min(bellyWidth,bellyHeight)*0.125;
  
  push();
  fill(0,153,153,100);
  
  // rotate belly
  
  let angleShoulders = angleTwoPoints(leftShoulder,rightShoulder);
  let angleHips = angleTwoPoints(leftHip,rightHip);
  translate(upperLeftX+bellyWidth*0.5,upperLeftY+bellyHeight*0.5);
  rotate((angleShoulders+angleHips)*0.5);
  
  try {
    rect(-bellyWidth*0.5,-bellyHeight*0.5,bellyWidth,bellyHeight,cornerRadius);
  } catch(err) {
    console.debug(err.message);
    console.debug("width: " + bellyWidth);
    console.debug("height: " + bellyHeight);
    console.debug("corner: " + cornerRadius);
    rect(-bellyWidth*0.5,-bellyHeight*0.5,bellyWidth,bellyHeight);
  }
  pop();
}

function drawJoint(firstIndex,secondIndex,jointWidth) {
  let leftAnchor = keypoints[firstIndex];
  let rightAnchor = keypoints[secondIndex];
  
  // calculate the distance between the ears
  let anchorDist = sqrt(pow(leftAnchor.x-rightAnchor.x,2)+pow(leftAnchor.y-rightAnchor.y,2));
  let angle = angleTwoPoints(leftAnchor,rightAnchor);
  
  let midX = (leftAnchor.x+rightAnchor.x)*0.5;
  let midY = (leftAnchor.y+rightAnchor.y)*0.5;
  
  push();
  fill(0,153,153,100);
  
  // translate and rotate joint
  translate(midX,midY);
  rotate(angle);
  
  ellipse(0,0,anchorDist,jointWidth);
  pop();
}

function angleTwoPoints(leftPoint,rightPoint) {
  // tan(alpha) = opposite / adjacent; solve for alpha
  return atan((rightPoint.y-leftPoint.y)/(rightPoint.x-leftPoint.x));
}

function drawSkeleton() {
  // draw edges between these points
  let edges = [
    [5,7], // left biceps
    [7,9], // left forearm
    [6,8], // right biceps
    [8,10], // right forearm
    [5,6], // shoulders
    [5,11], // left back
    [11,13], // left quad
    [13,15], // left calf
    [6,12], // right back
    [11,12], // waist
    [12,14], // right quad
    [14,16] // right calf
  ];
  
  for (let i=0;i<edges.length;i++) {
    lineBetweenPoints(edges[i][0],edges[i][1]);
  }
}

function lineBetweenPoints(firstIndex,secondIndex) {
  let firstPoint = keypoints[firstIndex];
  let secondPoint = keypoints[secondIndex];
  
  if (firstPoint.certainty >= CERTAINTY_THRESHOLD && secondPoint.certainty >= CERTAINTY_THRESHOLD) {
    stroke(255,255,255); // setting the line color to white
    line(firstPoint.x,firstPoint.y,secondPoint.x,secondPoint.y); // draw line
  }
}

// ACTIVATION FUNCTIONS -------------------------
function identityFunction(x) {return  x;}
function logarithmicFunction(x) {return Math.log(1+x) / Math.log(2);}
function squaredFunction(x) {return x*x;}
function sigmoidFunction(x) {return 1 / (1 + Math.exp(x));}

// KEYPOINT CLASS ----------------------------
class Keypoint {
  constructor(i) {
    this.index = i;
    this.x = 0;
    this.y = 0;
    this.certainty = 0;
    this.name = '';
  }

  update(newX,newY,newCertainty,name) {
    // THE FOLLOWING CODE IS DEPRECATED!
    /*
    // calculates midpoint between old and new x and y values
    this.x = (this.x+newX)*0.5;
    this.y = (this.y+newY)*0.5;
    this.certainty = newCertainty;
    */
    if (newCertainty > UPDATE_THRESHOLD) {
      this.x = this.updateCoord(this.x,this.certainty,newX,newCertainty);
      this.y = this.updateCoord(this.y,this.certainty,newY,newCertainty);
      this.certainty = this.updateCertain(this.certainty,newCertainty);
    }
    
    this.name = name;
  }
  
  updateCoord(oldValue, oldCertainty, newValue, newCertainty) {
    let activatedOldCertainty = ACTIVATION_FUNCTION(oldCertainty);
    let activatedNewCertainty = ACTIVATION_FUNCTION(newCertainty);
    return (activatedOldCertainty * oldValue + activatedNewCertainty * newValue) / (activatedOldCertainty + activatedNewCertainty);
  }
  
  updateCertain(oldCertainty, newCertainty) {
    let activatedOldCertainty = ACTIVATION_FUNCTION(oldCertainty);
    let activatedNewCertainty = ACTIVATION_FUNCTION(newCertainty);
    return (activatedOldCertainty * oldCertainty + activatedNewCertainty * newCertainty) / (activatedOldCertainty + activatedNewCertainty);
  }

  display(diam) {
    if (this.certainty >= CERTAINTY_THRESHOLD) {
      // draws a circle with its center at (this.x,this.y) and diameter diam
      ellipse(this.x, this.y, diam);
      fill(0,0,0); // setting color to black
      if (SHOW_NUMBERS == true) {
        if (MIRROR_VIDEO_FEED == true) {
          translate(width,0);
          scale(-1.0,1.0);
          text(this.index,width-this.x,this.y); // show the index of the keypoint
          translate(width,0);
          scale(-1.0,1.0);
        } else {
          text(this.index,this.x,this.y); // show the index of the keypoint
        }
      }
    }
  }
}