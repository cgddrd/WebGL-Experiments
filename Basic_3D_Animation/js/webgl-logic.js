// A global variable for the WebGL context
var gl;

var shaderProgram;

// Setup the 'model-view' matrix using 'glMatrix' library. - Used to represent the current move/rotate state of the 3D-space. 
var mvMatrix = mat4.create();

var pMatrix = mat4.create();

// Stack data structure used to hold the correct "current" state of the 'model-view' matrix. (Used by 'drawScene()' function)
var mvMatrixStack = [];

// NEW: Renamed from triangle to pyramid.
var pyramidVertexPositionBuffer;
var pyramidVertexColorBuffer;

// NEW: Renamed from square to cube.
var cubeVertexPositionBuffer;
var cubeVertexColorBuffer;

/*
 * NEW: We now have an additional buffer that tells the WebGL what vertices to use from 'cubeVertexPositionBuffer' to draw
 * all six faces out of two triangles for each.
 */
var cubeVertexIndexBuffer;

// Variables used to track the rotation of the triangle and square.
var rPyramid = 0;
var rCube = 0;

// Keeps track of the last time since the 'animate()' function was called. 
var lastTime = 0;

/* Updates the rotation angle by a number of degrees based on the duration since the last time the function was called. 
 *
 * This ensures that no matter how fast/slow the computer is, the shapes will always rotate at the same rate. 
 */
function animate() {
    var timeNow = new Date().getTime();
    
        if (lastTime != 0) {
            var elapsed = timeNow - lastTime;
            
            rPyramid += (90 * elapsed) / 1000.0;
            
            rCube -= (75 * elapsed) / 1000.0;
        }
    
    lastTime = timeNow;
}

/* Pushes the current "version/state" of the 'model-view' matrix ('mvMatrix') to the stack to store it's state. */
function mvPushMatrix() {
    var copy = mat4.create();
    mat4.copy(copy, mvMatrix);
    mvMatrixStack.push(copy);
}

/* Restores the currently stored version of the 'model-view' matrix ('mvMatrix') from the stack. */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "No 'model-view' matrix to pop!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/* Utility function to convert degrees to radians (required by the 'mat4.rotate()' function) */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

/* Setup and initialise WebGL (bind to HTML5 canvas) */
function initGL(canvas) {

	// Only continue if WebGL is available and working.
    try {
    
        // Try to grab the standard context. If it fails, fallback to experimental.
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        
        //Set the viewport width/height for WebGL to use later. 
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
        
    } catch (e) {
	    
	    console.log(e);
    }
    
    if (!gl) {
        alert("Could not initialise WebGL.");
    }
}

/* Extracts the WebGL shader code from the DOM. */
function getShader(gl, id) {

    var shaderScript = document.getElementById(id);
    
    if (!shaderScript) {
        return null;
    }
	
	// Load the actual shader code into the 'str' variable. 
    var str = "";
    
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    
    // Check the MIME type to determine if its a vertex or fragment shader, before creating the appropiate shader type.
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }
    
	// Load in the shader source taken from the DOM. 
    gl.shaderSource(shader, str);
    
    // Compile the shader program
    gl.compileShader(shader);

	// See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));  
        return null;
    }

    return shader;
}

/* Set-up and create the vertex and fragment shaders. */
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
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    /* Get the reference to the 'aVertexPosition' attribute that we want to pass to the vertex shader for each vertex. */
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
    /* Get the reference to the 'aVertexColor' attribute that we want to pass to the vertex shader for each vertex. */
    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}

/* Instructs WebGL to process the changes made the 'model-view' matrix and 'projection' matrix (by 'glMatrix' library) on the graphics card. */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/* Creates WebGL buffers that contain object vertices. */
function initBuffers() {
    
    // -- SET TRIANGLE VERTICES POSITION --
    
	// Create a WebGL buffer to store triangle vertex values. 
    pyramidVertexPositionBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, pyramidVertexPositionBuffer);
    
    var vertices = [
        // Front face
         0.0,  1.0,  0.0,
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
        // Right face
         0.0,  1.0,  0.0,
         1.0, -1.0,  1.0,
         1.0, -1.0, -1.0,
        // Back face
         0.0,  1.0,  0.0,
         1.0, -1.0, -1.0,
        -1.0, -1.0, -1.0,
        // Left face
         0.0,  1.0,  0.0,
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    pyramidVertexPositionBuffer.itemSize = 3;
    pyramidVertexPositionBuffer.numItems = 12;
    
    
    // -- SET TRIANGLE VERTICES COLOURS --
    
    pyramidVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pyramidVertexColorBuffer);
    
    var colors = [
        // Front face
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        // Right face
        1.0, 0.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        // Back face
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        // Left face
        1.0, 0.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        0.0, 1.0, 0.0, 1.0
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    pyramidVertexColorBuffer.itemSize = 4;
    pyramidVertexColorBuffer.numItems = 12;
    
    // -- SET SQUARE VERTICES POSITION --

    cubeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    vertices = [
      // Front face
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,

      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,

      // Top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0,

      // Bottom face
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,

      // Right face
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0,

      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeVertexPositionBuffer.itemSize = 3;
    cubeVertexPositionBuffer.numItems = 24;
    
    // -- SET SQUARE VERTICES COLOURS --
    
    cubeVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexColorBuffer);
    colors = [
      [1.0, 0.0, 0.0, 1.0],     // Front face
      [1.0, 1.0, 0.0, 1.0],     // Back face
      [0.0, 1.0, 0.0, 1.0],     // Top face
      [1.0, 0.5, 0.5, 1.0],     // Bottom face
      [1.0, 0.0, 1.0, 1.0],     // Right face
      [0.0, 0.0, 1.0, 1.0],     // Left face
    ];
    
    // NEW: Create a COMPLETE LIST/ARRAY of ALL the colours from the 'color' array as a 1-D array. 
    var unpackedColors = [];
    for (var i in colors) {
      var color = colors[i];
      for (var j=0; j < 4; j++) {
        unpackedColors = unpackedColors.concat(color);
      }
    }
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
    cubeVertexColorBuffer.itemSize = 4;
    cubeVertexColorBuffer.numItems = 24;
    
    // -- SET CUBE VERTICES INDEX BUFFER --
    
    cubeVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    
    var cubeVertexIndices = [
      0, 1, 2,      0, 2, 3,    // Front face
      4, 5, 6,      4, 6, 7,    // Back face
      8, 9, 10,     8, 10, 11,  // Top face
      12, 13, 14,   12, 14, 15, // Bottom face
      16, 17, 18,   16, 18, 19, // Right face
      20, 21, 22,   20, 22, 23  // Left face
    ]
    
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    cubeVertexIndexBuffer.itemSize = 1;
    cubeVertexIndexBuffer.numItems = 36;
}

/* Actually draws the objects to the WebGL screen. */
function drawScene() {
	
	// Create a new 3x1 vector to translate the model-view matrix by using the 'mat4.translate' function.
 	var translation = vec3.create();

	// Tell WebGL about the size of our <canvas> element. 
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    
    // Clear the <canvas> in preparation for drawing on it. 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Set-up the camera perspective.
	// Param 1: The matrix that we wish to output to
	// Param 2: 45 degree field of view 
	// Param 2: Width-height ratio of canvas
	// Param 4: Minimum distance from "camera" to render objects (0.1 units)
	// Param 5: Maximum distance from "camera" to render objects (100 units) 
    mat4.perspective(pMatrix, 45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

	// "Move" WebGL to the centre of the 3D-space.
    mat4.identity(mvMatrix);
    
    // -- DRAW THE TRIANGLE --

    vec3.set(translation, -1.5, 0.0, -7.0);
    
    mat4.translate(mvMatrix, mvMatrix, translation);
    
    /* "SAVE" the current "state" of the 'model-view' matrix before we perform any rotations via a STACK data structure. This is to ensure the next time we translate, it is not using the "rotated" state which would cause some weird behaviour. */
    mvPushMatrix();
    
    // Rotate the "CURRENT STATE" of the WebGL context (stored in the 'model-view' matrix) by a set number of degrees along the 'Y' axis.
    mat4.rotate(mvMatrix, mvMatrix, degToRad(rPyramid), [0, 1, 0]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, pyramidVertexPositionBuffer);
    
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, pyramidVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, pyramidVertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, pyramidVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    setMatrixUniforms();
    
    gl.drawArrays(gl.TRIANGLES, 0, pyramidVertexPositionBuffer.numItems);
    
    /* Once we are done rotating, we RESTORE the UN-ROTATED 'model-view' matrix ready for the next time we want to translate. (e.g. We can rotate the triangle around it's vertical axis without affecting the square.) */
    mvPopMatrix();

    // -- DRAW THE SQUARE --
    
    vec3.set(translation, 3.0, 0.0, 0.0);
    
    mat4.translate(mvMatrix, mvMatrix, translation);
    
    /* "SAVE" the current "state" of the 'model-view' matrix before we perform any rotations via a STACK data structure. This is to ensure the next time we translate, it is not using the "rotated" state which would cause some weird behaviour. */
    mvPushMatrix();
    
    // Rotate the "CURRENT STATE" of the WebGL context (stored in the 'model-view' matrix) by a set number of degrees along the 'X' axis.
    mat4.rotate(mvMatrix, mvMatrix, degToRad(rCube), [1, 1, 1]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, cubeVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    
    setMatrixUniforms();
    
    // NEW: 'drawElements()' is used to draw TWO DIFFERENT TRIANGLES to create ONE SINGLE CUBE FACE. 
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    
    /* Once we are done rotating, we RESTORE the UN-ROTATED 'model-view' matrix ready for the next time we want to translate. (e.g. We can rotate the square around it's horizontal axis without affecting the triangle.) */
    mvPopMatrix();
}

function tick() {
    
    /* Calls function in 'webgl-utils.js' library to provide browser-independent method of calling us back when it wants to repaint the WebGL scene — for example, next time the computer’s display is refreshing itself. */
    requestAnimFrame(tick);
    
    // Draw the current objects to the WebGL context. 
    drawScene();
    
    // Update the state (position) of the shapes ready for the next run. 
    animate();
}


/* Setup and initialise WebGL (bind to HTML5 canvas) */
function webGLStart() {

    var canvas = document.getElementById("glCanvas");
    
    //Initialise WebGL.
    initGL(canvas);
    
    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.
    initShaders();
    
    // Here's where we call the routine that builds all the objects
    // we'll be drawing.
    initBuffers();

	// Set clear color to black, fully opaque.
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // Enable depth testing.
    gl.enable(gl.DEPTH_TEST);
    
    // Tell WebgL to obscure far things with nearer things.
    gl.depthFunc(gl.LEQUAL);   

	//Actually draw the scene.
    tick();
    
}