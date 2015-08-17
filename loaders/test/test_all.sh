#!/bin/bash

cd "$(dirname "$0")"

./test_jsonify_xml__grants.sh; echo
echo
./test_format_bulk__fbo.sh; echo
echo
./test_format_bulk__grants.sh; echo
echo
./test_format_bulk_args.sh; echo # stub
echo
./test_load_bulk_into_es__fbo.sh; echo
echo
./test_load_bulk_into_es__grants.sh; echo
echo
./test_mod_loading.sh; echo
echo
./test_attachment_load_and_search.sh
