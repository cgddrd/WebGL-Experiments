var gl; // A global variable for the WebGL context

var horizAspect = 480.0/640.0;

var shaderProgram;

function start() {
  var canvas = document.getElementById("glCanvas");

  // Initialize the GL context.
  gl = initWebGL(canvas);      
  
  // Only continue if WebGL is available and working.
  if (gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set clear color to black, fully opaque.
    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing.
    gl.depthFunc(gl.LEQUAL);                                // Tell WebgL to obscure far things with nearer things.
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);      // Clear the color as well as the depth buffer.
    
    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.
    
    initShaders();
    
    // Here's where we call the routine that builds all the objects
    // we'll be drawing.
    
    initBuffers();
    
    // Set up to draw the scene periodically.
    
    setInterval(drawScene, 15);
    
  }
}

/* Setup and initialise WebGL (bind to HTML5 canvas) */
function initWebGL(canvas) {

  gl = null;
  
  try {
  
    // Try to grab the standard context. If it fails, fallback to experimental.
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  }
  
  catch(e) {
	  
	  console.log(e);
	  
  }
  
  // If we don't have a GL context, give up now
  if (!gl) {
  
    alert("Unable to initialize WebGL. Your browser may not support it.");
    gl = null;
    
  }
  
  return gl;
}

// Set-up and create the vertex and fragment shaders. 
function initShaders() {

  // Loaded from <script> element with ID "shader-fs"
  var fragmentShader = getShader(gl, "shader-fs");
  
  // Loaded from <script> element with ID "shader-fs"
  var vertexShader = getShader(gl, "shader-vs");
  
  // Create the shader program
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  
  // If creating the shader program failed, alert
  
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program.");
  }
  
  gl.useProgram(shaderProgram);
  
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
}

   var mvMatrix = mat4.create();
    var pMatrix = mat4.create();

    function setMatrixUniforms() {
        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    }

// Extracts the WebGL shader code from the DOM. 
function getShader(gl, id) {
  var shaderScript, theSource, currentChild, shader;
  
  shaderScript = document.getElementById(id);
  
  if (!shaderScript) {
    return null;
  }
  
  // Load the actual shader code into the 'theSource' variable. 
  theSource = "";
  currentChild = shaderScript.firstChild;
  
  while(currentChild) {
    if (currentChild.nodeType == currentChild.TEXT_NODE) {
      theSource += currentChild.textContent;
    }
    
    currentChild = currentChild.nextSibling;
  }
  
  // Check the MIME type to determine if its a vertex or fragment shader, before creating the appropiate shader type.
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
     // Unknown shader type
     return null;
  }
  
  // Load in the shader source taken from the DOM. 
  gl.shaderSource(shader, theSource);
    
  // Compile the shader program
  gl.compileShader(shader);  
    
  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {  
      alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));  
      return null;  
  }
    
  return shader;
}

// Creates WebGL buffers that contain object vertices.
function initBuffers() {
  
  // Create a WebGL buffer to store square vertex values. 
  squareVerticesBuffer = gl.createBuffer();
  
  // Bind this new buffer to the current WebGL context.
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
  
  // Vertices for the four corners of the square.
  var vertices = [
    1.0,  1.0,  0.0,
    -1.0, 1.0,  0.0,
    1.0,  -1.0, 0.0,
    -1.0, -1.0, 0.0
  ];
  
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  
}

// Actually draws the objects to the WebGL screen. 
function drawScene() {

  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	
  // Clear the context to our background colour.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // Set-up the camera perspective.
  // Param 1: 45 degree field of view 
  // Param 2: Width-height ratio of 640/480 (dimensions of canvas)
  // Param 3: Minimum distance from "camera" to render objects (0.1 units)
  // Param 4: Maximum distance from "camera" to render objects (100 units) 
  perspectiveMatrix = mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
  
  loadIdentity();
  mvTranslate([-0.0, 0.0, -6.0]);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  }