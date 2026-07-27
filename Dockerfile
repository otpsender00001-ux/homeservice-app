FROM php:8.2-apache

# Step 1: Burahin muna ang LAHAT ng MPM symlinks/configs para walang mag-conflict
RUN rm -f /etc/apache2/mods-enabled/mpm_*.load /etc/apache2/mods-enabled/mpm_*.conf

# Step 2: I-enable LANG ang mpm_prefork at rewrite
RUN a2enmod mpm_prefork rewrite

# Step 3: Install PHP extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Step 4: Kopyahin ang project files at permission settings
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

# Step 5: Dynamic PORT configuration para sa Railway
ENV PORT=8080
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

EXPOSE ${PORT}

CMD ["apache2-foreground"]