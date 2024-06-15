import serial.tools.list_ports

ports = list(serial.tools.list_ports.comports())
if ports:
    for port in ports:
        print(f"Port: {port.device}, Description: {port.description}, HWID: {port.hwid}")
else:
    print("No serial ports found")