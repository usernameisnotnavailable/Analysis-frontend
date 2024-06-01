# Használjuk a hivatalos Nginx alapképet
FROM nginx:alpine

# Másoljuk a statikus fájlokat az Nginx munkakönyvtárába
COPY . /usr/share/nginx/html

# Port beállítása
EXPOSE 80

# Nginx indulási parancs
CMD ["nginx", "-g", "daemon off;"]