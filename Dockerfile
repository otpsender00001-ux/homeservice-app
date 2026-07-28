FROM php:8.2-apache

# 1. Enable URL rewrite
RUN a2enmod rewrite

# 2. Siguraduhing Prefork MPM lang ang active (i-disable ang event at worker)
RUN a2dismod mpm_event mpm_worker || true \
    && a2enmod mpm_prefork

# 3. Install PHP extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# 4. Kopyahin ang mga files at ayusin ang permissions
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

# 5. I-configure ang Railway PORT (Mas ligtas na sed replacement para lang sa Listen at VirtualHost)
ENV PORT=8080
RUN sed -i 's/Listen 80/Listen ${PORT}/g' /etc/apache2/ports.conf \
    && sed -i 's/<VirtualHost \*:80>/<VirtualHost \*:${PORT}>/g' /etc/apache2/sites-available/000-default.conf

EXPOSE ${PORT}

CMD ["apache2-foreground"]