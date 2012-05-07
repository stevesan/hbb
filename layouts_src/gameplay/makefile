# First, in Photoshop, Scripts->Browse, run the psd export javascript, and choose this folder as the destination
# Then, do make all

TRACK_CURVE_DATA = "m 198.57143,802.36218 c -1.89221,59.52139 15.36592,141.42801 70,141.42857 65.11414,6.7e-4 108.98983,-76.78326 134.28571,-138.57143 27.07285,-66.12863 80.03133,-143.77765 130.71429,-140 60.90115,4.53926 65.11241,80.0877 67.14286,131.42858 3.64383,92.136 -16.81516,147.16722 -69.28572,147.85714 -59.52326,0.78265 -113.7548,-99.95925 -127.85714,-140 -11.54287,-32.77364 -67.11448,-142.30996 -130.71429,-139.28572 -65.13187,3.09709 -72.63377,85.17923 -74.28571,137.14286 z"
trackCode : trackCurve.svg
	python ~/hbox_git/pipeline/svgPath2UnityCode.py $(TRACK_CURVE_DATA)

all : export_layer_sets.txt *.png
	python ~/hbox_git/pipeline/elems2layout.py export_layer_sets.txt ~/hbox_git/unity_hbox/Assets/Resources/layouts/gameplay
