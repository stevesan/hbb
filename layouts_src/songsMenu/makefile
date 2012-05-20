# First, in Photoshop, Scripts->Browse, run the psd export javascript, and choose this folder as the destination
# Then, do make all

all : export_layer_sets.txt *.png
	python ~/bjr_git/pipeline/elems2layout.py export_layer_sets.txt ~/bjr_git/unity_hbox/Assets/Resources/layouts/songsMenu
