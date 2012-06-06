Shader "Custom/BlendAdd" {
	Properties {
		_MainTex ("Base (RGB)", 2D) = "black" {}
	}
	SubShader {
		Tags { "Queue"="Overlay" }

		Pass {
			//BlendOp RevSub
			Blend One One
			ZWrite Off
			SetTexture [_MainTex] { combine texture }
		}
	} 
}
