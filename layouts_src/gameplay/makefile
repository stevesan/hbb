# First, in Photoshop, Scripts->Browse, run the psd export javascript, and choose this folder as the destination
# Then, do make all

TRACK_CURVE_DATA = "m 198.57143,802.36218 c 1.65194,-51.96363 9.15384,-134.04577 74.28571,-137.14286 63.59981,-3.02424 119.17142,106.51208 130.71429,139.28572 14.10234,40.04075 68.33388,140.78265 127.85714,140 52.47056,-0.68992 72.92955,-55.72114 69.28572,-147.85714 -2.03045,-51.34088 -6.24171,-126.88932 -67.14286,-131.42858 -50.68296,-3.77765 -103.64144,73.87137 -130.71429,140 -25.29588,61.78817 -69.17157,138.5721 -134.28571,138.57143 -54.63408,-5.6e-4 -71.89221,-81.90718 -70,-141.42857 z"
trackCurve.txt : trackCurve.svg
	python ~/hbox_git/pipeline/svgPath2UnityCode.py $(TRACK_CURVE_DATA)

all : export_layer_sets.txt *.png
	python ~/hbox_git/pipeline/elems2layout.py export_layer_sets.txt ~/hbox_git/unity_hbox/Assets/Resources/layouts/gameplay
