FROM php:8.2-apache

# Siguraduhing prefork lang ang naka-enable na MPM module
RUN a2dismod mpm_event mpm_worker || true \
    && a2enmod mpm_prefork rewrite

# Install kinakailangang PHP extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Kopyahin ang project files
COPY . /var/www/html/

# Ayusin ang file permissions
RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

# I-configure ang Apache para makinig sa dynamic PORT ng Railway (defaulting to 8080)
ENV PORT=8080
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

EXPOSE ${PORT}

CMD ["apache2-foreground"]