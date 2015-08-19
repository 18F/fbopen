#!/bin/bash
set -e

cd "$(dirname "$0")"

source ./setup.sh

./test_jsonify_xml__grants.sh
./test_format_bulk__fbo.sh
./test_format_bulk__grants.sh
./test_format_bulk_args.sh
./test_load_bulk_into_es__fbo.sh
./test_load_bulk_into_es__grants.sh
./test_mod_loading.sh
./test_attachment_load_and_search.sh
