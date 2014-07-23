
workfiles_dir="$PWD/workfiles"

echo "Starting attachment scrape/load. See ~/log/grants_attach.log for more info..."
cd $FBOPEN_ROOT/loaders/attachments
python grants.py run --file $workfiles_dir/links.txt --log-to-stdout

echo "grants.gov attachment loader done"

