Shader "Custom/Frag Test" {
	Properties {
		_Color ("Main Color", Color) = (1,1,1,0.5)
		_Freq ("Displacement Wave Frequency", Float) = 1.0
		_Amp ("Displacement Wave Amplitude", Float) = 1.0
		_MainTex ("Texture", 2D) = "white" { }
		_SecondTex ("Secondary Texture", 2D) = "white" { }
		_DetailTex ("Detail Add Texture", 2D) = "black" { }
		_DetailScale ( "Detail Scale", Float) = 1.0
		_DetailUVScale ( "Detail UV Scale", Float) = 1.0
		_DetailBlend ( "Detail Blend Alpha", Float) = 1.0
		_FadeTex ("Fade Texture", 2D) = "black" { }
		_FadeStart ("Fade Start", Float) = 0.0
		_FadeEnd ("Fade End", Float) = 1.0
		_RippleMag("Ripple Magnitude", Float) = 0.01
		_NegAlpha( "Negative Alpha", Float) = 0
		_FlipRGBlend("Flip RG BLend", Float) = 0
	}

	SubShader {
		Pass {

			CGPROGRAM
			#pragma vertex vert
			#pragma fragment frag

			#include "UnityCG.cginc"

			float4 _Color;
			sampler2D _MainTex;
			sampler2D _SecondTex;
			sampler2D _FadeTex;
			sampler2D _DetailTex;
			float _DetailScale;
			float _DetailUVScale;
			float _DetailBlend;
			float _FadeStart;
			float _FadeEnd;
			float _Freq;
			float _Amp;
			float _RippleMag;
			float _NegAlpha;
			float _FlipRGBlend;

			struct vert2frag {
				float4  pos : SV_POSITION;
				float2  uv : TEXCOORD0;
			};

			float4 _MainTex_ST;

			//----------------------------------------
			//  
			//----------------------------------------
			vert2frag vert( appdata_base v )
			{
				vert2frag o;
				float4 p = v.vertex;
				p.y += _Amp*sin(2*_Freq*p.z);
				o.pos = mul (UNITY_MATRIX_MVP, p);
				o.uv = TRANSFORM_TEX (v.texcoord, _MainTex);
				return o;
			}

			//----------------------------------------
			//  
			//----------------------------------------
			half4 frag( vert2frag i ) : COLOR
			{
				// warp UV
				float2 uv = i.uv;
				uv.x += _RippleMag*sin(2*3.14*10*(uv.x));

				// compute fade alpha
				half4 fadeRGB = tex2D( _FadeTex, uv );
				float fade = clamp( fadeRGB.r, _FadeStart, _FadeEnd ) - _FadeStart;
				fade /= (_FadeEnd - _FadeStart);

				// compute faded color
				half4 texcolA = tex2D( _MainTex, uv );
				half4 texcolB = tex2D( _SecondTex, uv );
				half4 c = lerp( texcolA, texcolB, fade );

				// multiply in detail
				half4 d = c * _DetailScale * tex2D( _DetailTex, _DetailUVScale*uv );
				c = lerp( c, d, _DetailBlend );

				// lastly, apply negative alpha
				c = lerp( c, 1-c, _NegAlpha );

				float4 flipRG = c;
				float r = c.r;
				flipRG.r = flipRG.g;
				flipRG.g = r;
				c = lerp( c, flipRG, _FlipRGBlend );

				return c;
			}
			ENDCG
		}
	}
} 
