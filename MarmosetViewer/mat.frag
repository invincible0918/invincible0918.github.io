#extension GL_OES_standard_derivatives : enable
precision mediump float;
varying highp vec3 D;
varying mediump vec2 j;
varying mediump vec3 E;
varying mediump vec3 F;
varying mediump vec3 G;

#ifdef VERTEX_COLOR
varying lowp vec4 H;
#endif

#ifdef TEXCOORD_SECONDARY
varying mediump vec2 I;
#endif

uniform sampler2D tAlbedo;
uniform sampler2D tReflectivity;
uniform sampler2D tNormal;
uniform sampler2D tExtras;
uniform sampler2D tSkySpecular;
uniform vec4 uDiffuseCoefficients[9];
uniform vec3 uCameraPosition;
uniform vec3 uFresnel;
uniform float uAlphaTest;
uniform float uHorizonOcclude;
uniform float uHorizonSmoothing;

#ifdef EMISSIVE
uniform float uEmissiveScale;
uniform vec4 uTexRangeEmissive;
#endif

#ifdef AMBIENT_OCCLUSION
uniform vec4 uTexRangeAO;
#endif

#ifdef LIGHT_COUNT
uniform vec4 uLightPositions[LIGHT_COUNT];
uniform vec3 uLightDirections[LIGHT_COUNT];
uniform vec3 uLightColors[LIGHT_COUNT];
uniform vec3 uLightParams[LIGHT_COUNT];
uniform vec3 uLightSpot[LIGHT_COUNT];
#endif

#ifdef ANISO
uniform float uAnisoStrength;
uniform vec3 uAnisoTangent;
uniform float uAnisoIntegral;
uniform vec4 uTexRangeAniso;
#endif

#define saturate(x) clamp( x, 0.0, 1.0 )
#include <matsampling.glsl>
#include <matlighting.glsl>
#include <matshadows.glsl>
#include <matskin.glsl>
#include <matmicrofiber.glsl>
#include <matstrips.glsl>

#ifdef TRANSPARENCY_DITHER
#include <matdither.glsl>
#endif

void main(void)
{
//Albedo
vec4 J=texture2D(tAlbedo,j);
vec3 K=L(J.xyz);
float k=J.w;

//vertex color
#ifdef VERTEX_COLOR
{
	vec3 M=H.xyz;

	#ifdef VERTEX_COLOR_SRGB
		M=M*(M*(M*0.305306011+vec3(0.682171111))+vec3(0.012522878));
	#endif

	K*=M;

	#ifdef VERTEX_COLOR_ALPHA
		k*=H.w;
	#endif
}
#endif


#ifdef ALPHA_TEST
	if(k<uAlphaTest){discard;}
#endif

#ifdef TRANSPARENCY_DITHER
	k=(k>l(j.x))?1.0:k;
#endif

//Normal
vec3 N=O(texture2D(tNormal,j).xyz);

#ifdef ANISO
	#ifdef ANISO_NO_DIR_TEX
		vec3 P=Q(uAnisoTangent);
	#else
		J=R(j,uTexRangeAniso);
		vec3 P=2.0*J.xyz-vec3(1.0);
		P=Q(P);
	#endif

	P=P-N*dot(P,N);
	P=normalize(P);
	vec3 S=P*uAnisoStrength;
#endif


vec3 T=normalize(uCameraPosition-D);
J=texture2D(tReflectivity,j);
vec3 U=L(J.xyz);
//roughness
float V=J.w;
float W=V;


#ifdef HORIZON_SMOOTHING
	float X=dot(T,N);
	X=uHorizonSmoothing-X*uHorizonSmoothing;
	V=mix(V,1.0,X*X);
#endif


#ifdef STRIPVIEW
	Y Z;
	dc(Z,V,U);
#endif


float dd=1.0;

#ifdef AMBIENT_OCCLUSION
	#ifdef AMBIENT_OCCLUSION_SECONDARY_UV
		dd=R(I,uTexRangeAO).x;
	#else
		dd=R(j,uTexRangeAO).x;
	#endif
	dd*=dd;
#endif

//diffusiong env
#if defined(SKIN)
	de df;dh(df);
	df.di*=dd;
#elif defined(MICROFIBER)
	dj dk;
	dl(dk,N);
	dk.dm*=dd;
#else
	vec3 dn=du(N);
	dn*=dd;
#endif


//reflection env
vec3 dv=reflect(-T,N);

#ifdef ANISO
	vec3 rt=dv-(0.5*S*dot(dv,P));
	vec3 dA=dB(rt,mix(V,0.5*V,uAnisoStrength));
#else
	vec3 dA=dB(dv,V);
#endif

dA*=dC(dv,G);

//dynamic lighting
#ifdef LIGHT_COUNT

highp float dD=10.0/log2(V*0.968+0.03);
dD*=dD;
float dE=dD*(1.0/(8.0*3.1415926))+(4.0/(8.0*3.1415926));
dE=min(dE,1.0e3);

//collection shadowmap
#ifdef SHADOW_COUNT
	dF dG;
	#ifdef SKIN
		#ifdef SKIN_VERSION_1
			dH(dG,SHADOW_KERNEL+SHADOW_KERNEL*df.dI);
		#else
			dJ dK;
			float dL=SHADOW_KERNEL+SHADOW_KERNEL*df.dI;
			dM(dK,dL);
			dH(dG,dL);
		#endif
	#else
		dH(dG,SHADOW_KERNEL);
	#endif
#endif

#ifdef ANISO
	dE*=uAnisoIntegral;
#endif

//for dynamic lights
for(int u=0;u<LIGHT_COUNT;++u){
	vec3 dN=uLightPositions[u].xyz-D*uLightPositions[u].w;
	float dO=inversesqrt(dot(dN,dN));
	dN*=dO;
	float a=saturate(uLightParams[u].z/dO);
	a=1.0+a*(uLightParams[u].x+uLightParams[u].y*a);
	float s=saturate(dot(dN,uLightDirections[u]));
	s=saturate(uLightSpot[u].y-uLightSpot[u].z*(1.0-s*s));
	vec3 dP=(a*s)*uLightColors[u].xyz;

	#if defined(SKIN)
		#ifdef SHADOW_COUNT
			#ifdef SKIN_VERSION_1
				dQ(df,dG.dR[u],1.0,dN,N,dP);
			#else
				dQ(df,dG.dR[u],dK.dK[u],dN,N,dP);
			#endif
		#else
			dQ(df,1.0,0.0,dN,N,dP);
		#endif
	#elif defined(MICROFIBER)
		#ifdef SHADOW_COUNT
			dS(dk,dG.dR[u],dN,N,dP);
		#else
			dS(dk,1.0,dN,N,dP);
		#endif
	#else
		float dT=saturate((1.0/3.1415926)*dot(dN,N));
		#ifdef SHADOW_COUNT
			dT*=dG.dR[u];
		#endif
		dn+=dT*dP;
	#endif

	vec3 dU=dN+T;

	#ifdef ANISO
		dU=dU-(S*dot(dU,P));
	#endif

	dU=normalize(dU);
	float dV=dE*pow(saturate(dot(dU,N)),dD);

	#ifdef SHADOW_COUNT
		dV*=dG.dR[u];
	#endif

	dA+=dV*dP;
}
#endif


//extra diffusion
#if defined(SKIN)
	vec3 dn,diff_extra;
	dW(dn,diff_extra,df,T,N,V);
#elif defined(MICROFIBER)
	vec3 dn,diff_extra;
	dX(dn,diff_extra,dk,T,N,V);
#endif

dA*=dY(T,N,U,V*V);

#ifdef DIFFUSE_UNLIT
	gl_FragColor.xyz=K+dA;
#else
	gl_FragColor.xyz=dn*K+dA;
#endif

#if defined(SKIN) || defined(MICROFIBER)
	gl_FragColor.xyz+=diff_extra;
#endif

#ifdef EMISSIVE
	#ifdef EMISSIVE_SECONDARY_UV
		vec2 dZ=I;
	#else
		vec2 dZ=j;
	#endif
	gl_FragColor.xyz+=uEmissiveScale*L(R(dZ,uTexRangeEmissive).xyz);
#endif

#ifdef STRIPVIEW
	gl_FragColor.xyz=ec(Z,N,K,U,W,dn,dA,gl_FragColor.xyz);
#endif

#ifdef NOBLEND
	gl_FragColor.w=1.0;
#else
	gl_FragColor.w=k;
#endif
}
