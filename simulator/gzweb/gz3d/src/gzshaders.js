/**
 * @constructor
 * Holds custom shaders in string format which can be passed to
 * THREE.ShaderMaterial's options.
 */
GZ3D.Shaders = function()
{
  this.init();
};

GZ3D.Shaders.prototype.init = function()
{
  // Custom vertex shader for heightmaps
  this.heightmapVS =
    'varying vec2 vUv;'+
    'varying vec3 vPosition;'+
    'varying vec3 vNormal;'+
    'void main( void ) {'+
    '  vUv = uv;'+
    '  vPosition = position;'+
    '  vNormal = -normal;'+
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);'+
    '}';

  // Custom fragment shader for heightmaps
  this.heightmapFS =
    'uniform sampler2D texture0;'+
    'uniform sampler2D texture1;'+
    'uniform sampler2D texture2;'+
    'uniform float repeat0;'+
    'uniform float repeat1;'+
    'uniform float repeat2;'+
    'uniform float minHeight1;'+
    'uniform float minHeight2;'+
    'uniform float fadeDist1;'+
    'uniform float fadeDist2;'+
    'uniform vec3 ambient;'+
    'uniform vec3 lightDiffuse;'+
    'uniform vec3 lightDir;'+
    'varying vec2 vUv;'+
    'varying vec3 vPosition;'+
    'varying vec3 vNormal;'+
    'float blend(float distance, float fadeDist) {'+
    '  float alpha = distance / fadeDist;'+
    '  if (alpha < 0.0) {'+
    '    alpha = 0.0;'+
    '  }'+
    '  if (alpha > 1.0) {'+
    '    alpha = 1.0;'+
    '  }'+
    '  return alpha;'+
    '}'+
    'void main()'+
    '{'+
    '  vec3 diffuse0 = texture2D( texture0, vUv*repeat0 ).rgb;'+
    '  vec3 diffuse1 = texture2D( texture1, vUv*repeat1 ).rgb;'+
    '  vec3 diffuse2 = texture2D( texture2, vUv*repeat2 ).rgb;'+
    '  vec3 fragcolor = diffuse0;'+
    '  if (fadeDist1 > 0.0)'+
    '  {'+
    '    fragcolor = mix('+
    '      fragcolor,'+
    '      diffuse1,'+
    '      blend(vPosition.z - minHeight1, fadeDist1)'+
    '    );'+
    '  }'+
    '  if (fadeDist2 > 0.0)'+
    '  {'+
    '    fragcolor = mix('+
    '      fragcolor,'+
    '      diffuse2,'+
    '      blend(vPosition.z - (minHeight1 + minHeight2), fadeDist2)'+
    '    );'+
    '  }'+
    '  vec3 lightDirNorm = normalize(lightDir);'+
    '  float intensity = max(dot(vNormal, lightDirNorm), 0.0);'+
    '  vec3 vLightFactor = ambient + lightDiffuse * intensity;'+
    '  gl_FragColor = vec4(fragcolor.rgb * vLightFactor, 1.0);'+
    '}';
};
