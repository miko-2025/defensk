#include <emscripten.h>
#include <rote/tinyspline.h>
#include <stdlib.h>

EMSCRIPTEN_KEEPALIVE
tsBSpline *create_spline(double *plot, size_t plot_size){
	tsStatus status;
	tsBSpline *spline = (tsBSpline *) malloc(sizeof(tsBSpline));
	tsError error;

	tsReal *control = (tsReal *) malloc(plot_size * sizeof(double));
	for(size_t i = 0; i < plot_size; i++){
		control[i] = plot[i];
	}

	error = ts_bspline_new(4, 2, 3, TS_CLAMPED, spline, &status);
	if(!(error == TS_SUCCESS)){
		// TODO: Do something when _new fails
	}

	error = ts_bspline_set_control_points(
		spline,
		control,
		&status
	);
	if(!(error == TS_SUCCESS)){
		// TODO: Do something when _set_control_points fails
	}

	free(control);

	return spline;
}

EMSCRIPTEN_KEEPALIVE
void spline_at(tsBSpline *spline, double pos, tsReal *x, tsReal *y){
	tsStatus status;

	tsReal min;
	tsReal max;
	ts_bspline_domain(spline, &min, &max);

	double u = min + ((max - min) * pos);

	tsDeBoorNet net;
	ts_bspline_eval(spline, u, &net, &status);

	x[0] = ts_deboornet_result_ptr(&net)[0];
	y[0] = ts_deboornet_result_ptr(&net)[1];

	ts_deboornet_free(&net);
}

EMSCRIPTEN_KEEPALIVE
void spline_free(tsBSpline *spline){
	ts_bspline_free(spline);
	free(spline);
}
