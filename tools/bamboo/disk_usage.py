import psutil

parts = psutil.disk_partitions()

for p in parts:
    percent = psutil.disk_usage(p.mountpoint).percent
    print("Disk {0} is {1:.2f} percent full".format(p.mountpoint, percent))
    if percent > 75:
        raise Exception('LOW DISK SPACE on volume {}'.format(p.mountpoint), "WARNING LOW DISK SPACE")
