// A global variable for the WebGL context
var gl;

var shaderProgram;

// Setup the 'model-view' matrix using 'glMatrix' library. - Used to represent the current move/rotate state of the 3D-space. 
var mvMatrix = mat4.create();

var pMatrix = mat4.create();

// Stack data structure used to hold the correct "current" state of the 'model-view' matrix. (Used by 'drawScene()' function)
var mvMatrixStack = [];

var cubeVertexPositionBuffer;

// NEW: Texture coordinate buffer for the cube. 
var cubeVertexTextureCoordBuffer;

var xRot = 0;
var yRot = 0;
var zRot = 0;

/*
 * NEW: We now have an additional buffer that tells the WebGL what vertices to use from 'cubeVertexPositionBuffer' to draw
 * all six faces out of two triangles for each.
 */
var cubeVertexIndexBuffer;

// Variables used to track the rotation of the cube.
var rCube = 0;

// Keeps track of the last time since the 'animate()' function was called. 
var lastTime = 0;

// NEW: Represents the texture that we are wanting to add to our cube. 
var earthTexture;

/* NEW: Sets-up and loads the texture image file ready to apply to the WebGL faces. */
function initTexture() {

    // Create a new texture reference before loading the texture image in via JS
    earthTexture = gl.createTexture();
    earthTexture.image = new Image();
    
    // Background thread to load the image asynchronously. 
    earthTexture.image.onload = function() {
        handleLoadedTexture(earthTexture)
    }

    earthTexture.image.src = "earthmap1k.jpg";
}

/* NEW: Loads the texture into WebGL. */ 
function handleLoadedTexture(texture) {
    
    // Tell WebGL that the texture we are passing in is now the "current" texture.
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // All of the following functions will use the "current" texture set above. We do not pass in the texture as a parameter. 
    
    // Tell WebGL to "flip" the image on the Y axis (this is to do with a difference in coordinates between the image and WebGL.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    // Load the image into the "texture space" on the graphics card. 
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    
    // Tell WebGL how to scale the image. (We will come onto this more later)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    
    // Finally "tidy-up" after ourselves, removing the reference to the current texture. 
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

/* Updates the rotation angle by a number of degrees based on the duration since the last time the function was called. 
 *
 * This ensures that no matter how fast/slow the computer is, the shapes will always rotate at the same rate. 
 */
function animate() {
    var timeNow = new Date().getTime();
    
        if (lastTime != 0) {
            var elapsed = timeNow - lastTime;
            
            xRot += (25 * elapsed) / 1000.0;
            yRot += (90 * elapsed) / 1000.0;
            zRot += (90 * elapsed) / 1000.0;
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
    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

/* Instructs WebGL to process the changes made the 'model-view' matrix and 'projection' matrix (by 'glMatrix' library) on the graphics card. */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/* Creates WebGL buffers that contain object vertices. */
function initBuffers() {
    
    // -- SET cube VERTICES POSITION --

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
    
    // -- SET cube TEXTURES --
    
    cubeVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    var textureCoords = [
      // Front face
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,

      // Back face
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
      0.0, 0.0,

      // Top face
      0.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,

      // Bottom face
      1.0, 1.0,
      0.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,

      // Right face
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
      0.0, 0.0,

      // Left face
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    cubeVertexTextureCoordBuffer.itemSize = 2;
    cubeVertexTextureCoordBuffer.numItems = 24;
    
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

    // -- DRAW THE CUBE --
    
    mat4.translate(mvMatrix, mvMatrix, [0.0, 0.0, -5.0]);
    
    // NEW: Rotate along all the axis by a given angle.
    mat4.rotate(mvMatrix, mvMatrix, degToRad(xRot), [1, 0, 0]);
    mat4.rotate(mvMatrix, mvMatrix, degToRad(yRot), [0, 1, 0]);
    mat4.rotate(mvMatrix, mvMatrix, degToRad(zRot), [0, 0, 1]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    // NEW: Set-up the cube texture buffer. 
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    // NEW: Set the active texture. before drawing the cube.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, earthTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    
    setMatrixUniforms();

    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

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
    
    //Set-up and add the textures to the cube.
    initTexture();

	// Set clear color to black, fully opaque.
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // Enable depth testing.
    gl.enable(gl.DEPTH_TEST);
    
    // Tell WebgL to obscure far things with nearer things.
    gl.depthFunc(gl.LEQUAL);   

	//Actually draw the scene.
    tick();
    
}